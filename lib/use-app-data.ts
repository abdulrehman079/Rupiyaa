"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "./firebase";
import { useAuth } from "./auth-context";
import { stripUndefined } from "./utils";

type AppDataShape = {
  accounts: unknown[];
  transactions: unknown[];
  friends: unknown[];
  splits: unknown[];
  loans: unknown[];
};

const LEGACY_KEY = "rupiyaa-v2";
const userKey = (uid: string) => `rupiyaa-v2-${uid}`;
const WRITE_DEBOUNCE_MS = 500;

type SyncState = "idle" | "loading" | "synced" | "saving" | "offline";

function normalize<T extends AppDataShape>(seed: T, raw: unknown): T {
  const r = (raw && typeof raw === "object" ? (raw as Partial<T>) : {}) as Partial<T>;
  return {
    ...seed,
    ...r,
    accounts: r.accounts || [],
    transactions: r.transactions || [],
    friends: r.friends || [],
    splits: r.splits || [],
    loans: r.loans || [],
  } as T;
}

function readLocal<T extends AppDataShape>(seed: T, key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalize(seed, JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded or storage disabled — ignore
  }
}

export function useAppData<T extends AppDataShape>(seed: T) {
  const { user } = useAuth();
  const [data, setData] = useState<T>(seed);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextWrite = useRef(true);
  const lastCloudJson = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoaded(false);
      setSync("idle");
      return;
    }

    const key = userKey(user.uid);
    setSync("loading");
    skipNextWrite.current = true;
    lastCloudJson.current = null;

    // 1. Instant offline-first hydrate from localStorage. The app is usable
    //    immediately, even if the network is down or RTDB is slow.
    const local = readLocal(seed, key);
    if (local) {
      setData(local);
      setLoaded(true);
    }

    // 2. Subscribe to RTDB for cloud-of-truth updates.
    const userRef = ref(rtdb, `users/${user.uid}/data`);
    const unsub = onValue(
      userRef,
      async (snap) => {
        const cloud = snap.val();

        if (cloud && typeof cloud === "object") {
          const normalized = normalize(seed, cloud);
          const cloudJson = JSON.stringify(normalized);

          // Ignore the echo of our own write (cloud matches what we just sent).
          if (cloudJson === lastCloudJson.current) {
            setSync("synced");
            return;
          }
          lastCloudJson.current = cloudJson;
          skipNextWrite.current = true;
          setData(normalized);
          writeLocal(key, normalized);
          setLoaded(true);
          setSync("synced");
          return;
        }

        // Cloud is empty for this user.
        // One-time legacy migration: if the pre-auth localStorage key has
        // data, upload it to cloud and clear it. Happens at most once per
        // device.
        const legacy = readLocal(seed, LEGACY_KEY);
        if (legacy) {
          skipNextWrite.current = false;
          setData(legacy);
          writeLocal(key, legacy);
          try {
            const clean = stripUndefined(legacy);
            await set(userRef, clean);
            lastCloudJson.current = JSON.stringify(normalize(seed, clean));
            if (typeof window !== "undefined") localStorage.removeItem(LEGACY_KEY);
            setSync("synced");
          } catch {
            setSync("offline");
          }
          setLoaded(true);
          return;
        }

        // Truly empty: brand-new account OR user just erased their data.
        // Do NOT restore from per-user local cache — that would defeat the
        // Erase button (which is the bug the user reported). Treat cloud as
        // authoritative: clear state and the per-user local cache to seed.
        skipNextWrite.current = true;
        lastCloudJson.current = JSON.stringify(normalize(seed, seed));
        setData(seed);
        writeLocal(key, seed);
        setLoaded(true);
        setSync("synced");
      },
      () => {
        // Permission denied or network down — local copy is already loaded;
        // mark offline so the UI can hint at it.
        setLoaded(true);
        setSync("offline");
      },
    );

    return () => {
      unsub();
      if (writeTimer.current) {
        clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
    };
  }, [user, seed]);

  // Write effect: localStorage immediately + debounced RTDB.
  useEffect(() => {
    if (!user || !loaded) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    const key = userKey(user.uid);
    // Local write is synchronous and never debounced — survives offline.
    writeLocal(key, data);

    if (writeTimer.current) clearTimeout(writeTimer.current);
    setSync("saving");
    writeTimer.current = setTimeout(async () => {
      try {
        const clean = stripUndefined(data);
        await set(ref(rtdb, `users/${user.uid}/data`), clean);
        lastCloudJson.current = JSON.stringify(clean);
        setSync("synced");
      } catch {
        // Stay offline — the local write is safe; we'll retry on the next edit
        // or when the listener reconnects.
        setSync("offline");
      }
    }, WRITE_DEBOUNCE_MS);
  }, [data, user, loaded]);

  return { data, setData, loaded, sync };
}
