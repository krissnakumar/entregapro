import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.entregapro.web',
  appName: 'EntregaPRO',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
