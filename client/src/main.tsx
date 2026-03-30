import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeMobile } from "./mobile-init";
import { Capacitor } from "@capacitor/core";

const isMobile = Capacitor.isNativePlatform();

console.log('[GLP Friend Init] Starting app initialization', {
  isMobile,
  platform: Capacitor.getPlatform(),
  env: import.meta.env.MODE,
});

// Initialize mobile platform features and render app
// IMPORTANT: Initialize mobile features BEFORE rendering to set up auth token getter
(async () => {
  try {
    await initializeMobile();
    console.log('[GLP Friend Init] Mobile initialization complete');
  } catch (error) {
    console.error('[GLP Friend Init] Mobile init error:', error);
  }

  createRoot(document.getElementById("root")!).render(
    <App />
  );

  console.log('[GLP Friend Init] App rendered');
})();
