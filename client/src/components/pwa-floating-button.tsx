import React from "react";
import { PwaInstallButton } from "@/components/pwa-install-button";

export default function PwaFloatingButton() {
  return (
    <div className="fixed bottom-4 left-4 z-50 md:hidden">
      <PwaInstallButton className="!px-3 !py-2 rounded-full text-sm" />
    </div>
  );
}
