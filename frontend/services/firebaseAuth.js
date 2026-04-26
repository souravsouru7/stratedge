"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error("Firebase is not configured. Missing NEXT_PUBLIC_FIREBASE_* environment variables.");
  }

  return config;
};

const getFirebaseApp = () => {
  if (getApps().length > 0) return getApp();
  return initializeApp(getFirebaseConfig());
};

const getFirebaseAuth = async () => {
  const auth = getAuth(getFirebaseApp());
  if (!isCapacitorApp()) {
    await setPersistence(auth, browserLocalPersistence);
  }
  return auth;
};

const isCapacitorApp = () => typeof window !== "undefined" && !!window.Capacitor;
const isCapacitorAndroid = () => isCapacitorApp() && window.Capacitor?.getPlatform?.() === "android";

const isMobileBrowser = () => {
  if (typeof window === "undefined" || isCapacitorApp()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const shouldUseRedirectForWebGoogle = () => {
  // Production popup flows can fail under COOP policies; prefer redirect unless explicitly disabled.
  const envOverride = process.env.NEXT_PUBLIC_FIREBASE_GOOGLE_WEB_FLOW;
  if (envOverride === "popup") return false;
  if (envOverride === "redirect") return true;
  return process.env.NODE_ENV === "production";
};

// Native Google Sign-In via @capacitor-firebase/authentication
const signInWithNativeGoogle = async () => {
  let FirebaseAuthentication;
  try {
    const mod = await import("@capacitor-firebase/authentication");
    FirebaseAuthentication = mod.FirebaseAuthentication;
  } catch {
    throw new Error("@capacitor-firebase/authentication plugin is not installed. Run: npm install @capacitor-firebase/authentication && npx cap sync");
  }

  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;

  if (!idToken) {
    throw new Error(
      "Google Sign-In returned no ID token. " +
      "Make sure your SHA-1 fingerprint is added in Firebase Console and google-services.json is up to date."
    );
  }

  // Exchange Google ID token for Firebase ID token so backend always gets a Firebase token
  const auth = await getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const firebaseResult = await signInWithCredential(auth, credential);
  return firebaseResult.user.getIdToken();
};

const REDIRECT_PENDING_KEY = "firebase_google_redirect_pending";
const setRedirectPending = () => {
  try { sessionStorage.setItem(REDIRECT_PENDING_KEY, "1"); } catch { /* ignore */ }
  try { localStorage.setItem(REDIRECT_PENDING_KEY, "1"); } catch { /* ignore */ }
};
const hasRedirectPending = () => {
  try {
    if (sessionStorage.getItem(REDIRECT_PENDING_KEY)) return true;
  } catch { /* ignore */ }
  try {
    if (localStorage.getItem(REDIRECT_PENDING_KEY)) return true;
  } catch { /* ignore */ }
  return false;
};
const clearRedirectPending = () => {
  try { sessionStorage.removeItem(REDIRECT_PENDING_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(REDIRECT_PENDING_KEY); } catch { /* ignore */ }
};

const signInWithWebGoogle = async () => {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  if (isMobileBrowser() || shouldUseRedirectForWebGoogle()) {
    setRedirectPending();
    await signInWithRedirect(auth, provider);
    return null; // page reloads; result handled in handleGoogleRedirectResult
  }

  const result = await signInWithPopup(auth, provider);
  if (!isCapacitorApp()) {
    try { await setPersistence(auth, browserLocalPersistence); } catch { /* non-fatal */ }
  }
  return result.user.getIdToken();
};

export const handleGoogleRedirectResult = async () => {
  if (typeof window === "undefined") return null;
  if (!hasRedirectPending() && !isMobileBrowser()) return null;

  try {
    const auth = await getFirebaseAuth();
    const result = await getRedirectResult(auth);
    clearRedirectPending();
    if (!result) return null;
    return result.user.getIdToken();
  } catch (err) {
    clearRedirectPending();
    console.error("[GoogleAuth] redirect result error:", err);
    throw err;
  }
};

export const signInWithFirebaseGoogle = async () => {
  if (isCapacitorAndroid() || isCapacitorApp()) {
    return signInWithNativeGoogle();
  }
  return signInWithWebGoogle();
};
