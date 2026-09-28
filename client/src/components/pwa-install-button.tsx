import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSTALLED_STORAGE_KEY = "cima-pwa-installed";
const DISMISS_EVENT = "cima-pwa-install-dismissed";
let installPromptDismissedForPage = false;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isPwaInstalled() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  try {
    return isStandalone || window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "true";
  } catch {
    return isStandalone;
  }
}

function rememberPwaInstalled() {
  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
  } catch {
    // Standalone display mode and the appinstalled event still hide the button
    // when browser storage is unavailable.
  }
}

export function PwaInstallButton({
  className = "",
  buttonClassName = "",
  dismissClassName = "",
  compact = false,
}: {
  className?: string;
  buttonClassName?: string;
  dismissClassName?: string;
  compact?: boolean;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);
  const [isDismissed, setIsDismissed] = useState(installPromptDismissedForPage);

  useEffect(() => {
    if (isPwaInstalled()) {
      setIsStandalone(true);
    }

    const handleDismissed = () => setIsDismissed(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isPwaInstalled()) {
        setIsStandalone(true);
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsUnsupported(false);
    };

    const handleAppInstalled = () => {
      rememberPwaInstalled();
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsUnsupported(false);
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener(DISMISS_EVENT, handleDismissed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener(DISMISS_EVENT, handleDismissed);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isSafari = userAgent.includes("safari") && !userAgent.includes("chrome") && !userAgent.includes("chromium") && !userAgent.includes("android");

    setIsUnsupported(true);

    if (isSafari) {
      window.alert("To install CIMA Learn on iPhone or iPad, tap the Share button then choose 'Add to Home Screen'.");
      return;
    }

    window.alert("Install is only available in supported browsers like Chrome or Edge on a secure HTTPS page. If you're testing locally, open the app with the browser's install prompt enabled.");
  };

  const handleDismiss = () => {
    installPromptDismissedForPage = true;
    setIsDismissed(true);
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        onClick={handleInstall}
        className={`inline-flex items-center gap-2 rounded-full bg-[#5A2633] text-white px-4 py-2 text-sm font-semibold shadow-[0_10px_25px_rgba(97,0,0,0.25)] transition-all hover:bg-[#7a0d0d] hover:shadow-[0_12px_28px_rgba(97,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A2633] focus-visible:ring-offset-2 ${buttonClassName}`}
      >
        <Smartphone className="h-4 w-4" />
        <span>{isUnsupported ? "Install Guide" : compact ? "Install" : "Install App"}</span>
        {!compact && <Download className="h-4 w-4" />}
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Not now — hide the install prompt until your next visit"
        className={`whitespace-nowrap rounded-full border border-[#5A2633]/15 bg-white px-2 py-2 text-sm font-semibold text-[#5A2633] shadow-sm transition-colors hover:bg-[#5A2633]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A2633] focus-visible:ring-offset-2 ${dismissClassName}`}
      >
        Not now
      </button>
    </div>
  );
}
