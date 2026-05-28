import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Skip Firebase initialisation when we're in the server-side prerender path
// AND the env vars haven't been baked in yet. The whole app is "use client",
// so nothing touches these exports during SSG — but module evaluation alone
// used to call initializeApp() with undefined values and crash the build.
const isClient = typeof window !== "undefined";
const hasConfig = !!firebaseConfig.apiKey;
const live = isClient || hasConfig;

export const firebaseApp: FirebaseApp = live
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : ({} as FirebaseApp);

export const auth: Auth = live ? getAuth(firebaseApp) : ({} as Auth);
export const rtdb: Database = live ? getDatabase(firebaseApp) : ({} as Database);
export const googleProvider: GoogleAuthProvider = live
  ? new GoogleAuthProvider()
  : ({} as GoogleAuthProvider);
