import { createRoot } from "react-dom/client";
// import { ClerkProvider } from "@clerk/clerk-react"; // DISABLED - Using native Clerk iOS SDK only
import App from "./App";
import "./index.css";
import { initializeMobile } from "./mobile-init";
import { Capacitor } from "@capacitor/core";

// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY; // DISABLED - Using native SDK

console.log('[SemaSlim Init] Starting app initialization (Native Clerk Only)', {
  isMobile: Capacitor.isNativePlatform(),
  platform: Capacitor.getPlatform(),
  mode: 'native-clerk-ios',
  env: import.meta.env.MODE
});

// Unregister any existing service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    console.log('[SemaSlim Init] Unregistering service workers:', registrations.length);
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Initialize mobile platform features and render app
// IMPORTANT: Initialize mobile features BEFORE rendering to set up auth token getter
(async () => {
  try {
    // Initialize mobile features (sets up auth token getter)
    await initializeMobile();
    console.log('[SemaSlim Init] Mobile initialization complete');
  } catch (error) {
    console.error('[SemaSlim Init] Mobile init error:', error);
  }

  // Note: Using NATIVE Clerk iOS SDK only
  // Web-based ClerkProvider is DISABLED to avoid conflicts
  // All authentication is handled by native ClerkPlugin.swift

  console.log('[SemaSlim Init] Rendering app without ClerkProvider (native only)');

  createRoot(document.getElementById("root")!).render(
    <App />
  );

  console.log('[SemaSlim Init] App rendered with native Clerk SDK');
})();
