import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edgecpline',
  appName: 'Edgecipline',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      // Web / server OAuth client (client_type 3 in google-services.json).
      // Used on web and iOS, and as the serverClientId on Android to request an ID token.
      clientId: '466233608400-9j5m11998vtl33ctuhjkpsl4phlmamif.apps.googleusercontent.com',
      // On Android, the plugin passes androidClientId into requestIdToken() and
      // requestServerAuthCode() — both require the WEB client ID, not the Android one.
      androidClientId: '466233608400-9j5m11998vtl33ctuhjkpsl4phlmamif.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      // serverClientId tells the Android plugin which OAuth client to request an ID token for.
      // Keep this as the web client ID so Firebase can verify the token.
      serverClientId: '466233608400-9j5m11998vtl33ctuhjkpsl4phlmamif.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    }
  }
};

export default config;
