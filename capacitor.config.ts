import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.semaslim.app',
  appName: 'SemaSlim',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow Clerk authentication domains for in-app authentication
    allowNavigation: [
      '*.clerk.accounts.dev',
      'https://*.clerk.accounts.dev',
      'https://complete-bullfrog-71.clerk.accounts.dev',
      'https://accounts.clerk.dev',
      'https://accounts.clerk.com',
    ],
    // For development with live reload, uncomment the URL below
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'ionic',
      style: 'dark',
      resizeOnFullScreen: false,
    },
  },
  ios: {
    // Register custom native plugins
    includePlugins: ['ClerkPlugin'],
  },
};

export default config;
