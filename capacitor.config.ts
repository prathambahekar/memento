import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memento.app',
  appName: 'Memento',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
