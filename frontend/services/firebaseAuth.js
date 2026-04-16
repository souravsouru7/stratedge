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

  if (!isCapacitorApp()) {
    await setPersistence(auth, browserLocalPersistence);
  }

  return auth;
};

const isCapacitorApp = () => {
  return typeof window !== "undefined" && !!window.Capacitor;
};

const isCapacitorAndroid = () => {
  return isCapacitorApp() && window.Capacitor?.getPlatform?.() === "android";
};

const getNativeGoogleAuth = async () => {
  try {
    const plugin = await import("@codetrix-studio/capacitor-google-auth");
    if (plugin?.GoogleAuth?.signIn) {
      return plugin.GoogleAuth;
    }
  } catch (error) {
    console.warn("GoogleAuth plugin import failed.", error);
  }

  return null;
};

const withTimeout = async (promise, ms, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const signInWithNativeGoogle = async () => {
  const GoogleAuth = await getNativeGoogleAuth();

  if (!GoogleAuth) {
    throw new Error("GoogleAuth native plugin is unavailable.");
  }

  // The plugin's loadSignInClient() passes clientId directly into both
  // requestIdToken(clientId) and requestServerAuthCode(clientId).
  // Both calls require the WEB client ID — never the Android OAuth client ID.
  // Always set clientId explicitly here so it overrides whatever androidClientId
  // the plugin would otherwise read from capacitor.config.ts.
  const webClientId =
    process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!webClientId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID or NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
  }

  const initOptions = {
    clientId: webClientId,
    scopes: ["profile", "email"],
    // Do NOT set grantOfflineAccess:true — that maps to requestServerAuthCode(clientId, true)
    // on Android, which forces a re-consent screen on every sign-in and causes the flow to hang.
    // We only need the idToken, which comes from requestIdToken(clientId) alone.
    grantOfflineAccess: false,
  };

  try {
    await withTimeout(
      GoogleAuth.initialize(initOptions),
      10000,
      "Google Sign-In initialization timed out."
    );
  } catch (err) {
    console.error("[GoogleAuth] initialize() failed:", err?.message ?? err);
    throw err;
  }

  let googleUser;
  try {
    // 120 s: enough time for the user to pick an account + complete the OAuth redirect.
    googleUser = await withTimeout(
      GoogleAuth.signIn(),
      120000,
      "Google Sign-In timed out after 120 s. " +
        "Check: (1) SHA-1 fingerprint matches Firebase Console, " +
        "(2) androidClientId in capacitor.config.ts matches google-services.json client_type 1, " +
        "(3) google-services.json is up-to-date."
    );
  } catch (err) {
    console.error("[GoogleAuth] signIn() failed:", err?.message ?? err);
    throw err;
  }

  const idToken = googleUser?.authentication?.idToken;

  if (!idToken) {
    const authObj = JSON.stringify(googleUser?.authentication ?? {});
    const err = new Error(
      `Google sign-in succeeded but returned no ID token. authentication=${authObj}`
    );
    console.error("[GoogleAuth]", err.message);
    throw err;
  }

  // Exchange the Google ID token for a Firebase ID token on ALL platforms so the
  // backend always receives a Firebase token that Firebase Admin can verify directly.
  let firebaseResult;
  try {
    const auth = await getFirebaseAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    firebaseResult = await withTimeout(
      signInWithCredential(auth, credential),
      20000,
      "Firebase credential exchange timed out. Verify the Firebase web config values."
    );
  } catch (err) {
    console.error(
      "[GoogleAuth] Firebase signInWithCredential failed — falling back to raw Google token:",
      err?.message ?? err
    );
    // Fall back to the raw Google ID token so the backend can still verify it
    // via the Google tokeninfo endpoint.
    return idToken;
  }

  try {
    return await withTimeout(
      firebaseResult.user.getIdToken(),
      10000,
      "Fetching Firebase ID token timed out."
    );
  } catch (err) {
    console.error("[GoogleAuth] getIdToken() failed:", err?.message ?? err);
    throw err;
  }
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
  if (isCapacitorAndroid()) {
    try {
      return await signInWithNativeGoogle();
    } catch (error) {
      const msg = String(error?.message || "");
      const pluginMissing =
        /plugin is not implemented|not implemented on android|googleauth native plugin is unavailable|googleauth/i.test(msg);

      if (pluginMissing) {
        throw new Error(
          "Google Sign-In is not configured for this Android build. " +
            "Please sync the Capacitor app, rebuild Android, and verify Firebase SHA keys/google-services.json."
        );
      }

      throw error;
    }
  }

  if (isCapacitorApp()) {
    try {
      return await signInWithNativeGoogle();
    } catch (error) {
      const msg = String(error?.message || "");
      const pluginMissing =
        /plugin is not implemented|not implemented on android|googleauth native plugin is unavailable|googleauth/i.test(msg);

      if (!pluginMissing) {
        throw error;
      }

      console.warn("Native GoogleAuth plugin unavailable, falling back to web sign-in.");
    }
  }

  return signInWithWebGoogle();
};
