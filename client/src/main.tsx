import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Initialize i18n

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
