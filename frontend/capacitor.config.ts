import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stratedge.app',
  appName: 'LOGNERA',
  webDir: 'out',
  server: {
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1045232719142-uccmv2nnco3rcmvs1k6s2l44h9jla1fg.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
