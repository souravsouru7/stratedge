import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edgecpline',
  appName: 'Edgecipline',
  webDir: 'out',
  server: {
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '394303085328-0spvnvp2tr0iktig0rkeqs435ktldjfu.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
