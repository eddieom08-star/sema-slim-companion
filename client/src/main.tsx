import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt, preloadCriticalAssets } from "@/lib/pwa";
import { setupOfflineQueueSync } from "@/lib/offline-queue";

registerServiceWorker();
setupInstallPrompt();
setupOfflineQueueSync();

preloadCriticalAssets([
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/manifest.json',
]);

createRoot(document.getElementById("root")!).render(<App />);
