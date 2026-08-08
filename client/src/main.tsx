import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Initialize i18n

// After a new deploy, an already-open tab can still reference old lazy-loaded
// chunk hashes that no longer exist on the server. Recover by reloading once
// instead of showing a dead error screen; the guard prevents a reload loop
// if the failure isn't actually a stale-deploy issue.
window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem("chunk-reload-attempted")) return;
  sessionStorage.setItem("chunk-reload-attempted", "1");
  window.location.reload();
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

createRoot(document.getElementById("root")!).render(<App />);
