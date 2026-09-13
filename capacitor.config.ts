import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.convogram.app',
  appName: 'Convogram',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: '#071426',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#071426'
    }
  }
};

export default config;
