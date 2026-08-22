import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Initialize i18n
import { attemptChunkReload } from "@/lib/chunk-reload";

// After a new deploy, an already-open tab can still reference old lazy-loaded
// chunk hashes that no longer exist on the server. Recover by reloading
// instead of showing a dead error screen.
window.addEventListener("vite:preloadError", () => {
  attemptChunkReload();
});

// Filter out browser extension errors in development
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args) => {
    const errorString = args.join(' ');
    // Ignore extension-related errors
    if (
      errorString.includes('contentscript.js') ||
      errorString.includes('ObjectMultiplex') ||
      errorString.includes('MaxListenersExceededWarning')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // Unregister all existing service workers to clear cache issues
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      
      // Register the new service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service worker registered successfully");
      
      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("Service worker updated");
            }
          });
        }
      });
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
