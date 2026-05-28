"use client";

import { useEffect } from "react";

type Handler = () => boolean; // return true if the back press was handled

/**
 * Wire Android's hardware/gesture back button (via @capacitor/app).
 *
 * Runs through the given handlers in order — first one that returns true wins.
 * If none handle it, exits the app. No-op on web / desktop.
 */
export function useAndroidBack(handlers: Handler[]) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    let listener: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        if (cancelled) return;
        listener = await App.addListener("backButton", () => {
          for (const h of handlers) {
            if (h()) return;
          }
          App.exitApp();
        });
      } catch {
        // Plugin not available — silently skip.
      }
    })();

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [handlers]);
}
