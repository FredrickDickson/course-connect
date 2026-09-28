import React from "react";
import { PwaInstallButton } from "@/components/pwa-install-button";

export default function PwaFloatingButton() {
  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] md:hidden">
      <PwaInstallButton
        compact
        className="gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-black/10 backdrop-blur-sm"
        buttonClassName="!gap-1 !px-2 !py-2 rounded-full text-sm"
        dismissClassName="!px-2 !py-2 text-xs"
      />
    </div>
  );
}
