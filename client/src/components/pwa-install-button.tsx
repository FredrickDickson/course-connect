import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsUnsupported(false);
    };

    const handleAppInstalled = () => {
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

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
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

  if (isStandalone) {
    return null;
  }

  return (
    <Button
      type="button"
      onClick={handleInstall}
      className={`inline-flex items-center gap-2 rounded-full bg-[#5A2633] text-white px-4 py-2 text-sm font-semibold shadow-[0_10px_25px_rgba(97,0,0,0.25)] transition-all hover:bg-[#7a0d0d] hover:shadow-[0_12px_28px_rgba(97,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A2633] focus-visible:ring-offset-2 ${className}`}
    >
      <Smartphone className="h-4 w-4" />
      <span>{isUnsupported ? "Install Guide" : "Install App"}</span>
      <Download className="h-4 w-4" />
    </Button>
  );
}
