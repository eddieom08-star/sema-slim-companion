import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt, preloadCriticalAssets } from "@/lib/pwa";
import { setupOfflineQueueSync } from "@/lib/offline-queue";

const PUBLISHABLE_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

registerServiceWorker();
setupInstallPrompt();
setupOfflineQueueSync();

preloadCriticalAssets([
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/manifest.json',
]);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
