"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
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
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseConfig());
};

const getFirebaseAuth = async () => {
  const auth = getAuth(getFirebaseApp());
  await setPersistence(auth, browserLocalPersistence);
  return auth;
};

const isCapacitorApp = () => {
  return typeof window !== "undefined" && !!window.Capacitor;
};

const signInWithNativeGoogle = async () => {
  const auth = await getFirebaseAuth();
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

  await GoogleAuth.initialize({
    clientId:
      process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ["profile", "email"],
    grantOfflineAccess: true,
  });

  const googleUser = await GoogleAuth.signIn();
  const idToken = googleUser?.authentication?.idToken;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);

  return result.user.getIdToken();
};

const signInWithWebGoogle = async () => {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};

export const signInWithFirebaseGoogle = async () => {
  if (isCapacitorApp()) {
    return signInWithNativeGoogle();
  }

  return signInWithWebGoogle();
};
