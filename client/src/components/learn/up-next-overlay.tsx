import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";

interface Props {
  nextTitle: string;
  onPlay: () => void;
  onCancel: () => void;
}
export default function UpNextOverlay({ nextTitle, onPlay, onCancel }: Props) {
  const [secs, setSecs] = useState(5);
  useEffect(() => {
    if (secs <= 0) { onPlay(); return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, onPlay]);

  return (
    <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1C1D1F] text-white rounded-lg p-6 max-w-md w-full text-center space-y-4">
        <p className="text-sm text-white/70">Up next in {secs} second{secs === 1 ? "" : "s"}…</p>
        <h3 className="text-lg font-semibold">{nextTitle}</h3>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={onPlay} className="bg-[#B91C1C] hover:bg-[#A01818] text-white">
            <Play className="h-4 w-4 mr-2 fill-white" /> Play now
          </Button>
          <Button onClick={onCancel} variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4 mr-2" /> Cancel auto-advance
          </Button>
        </div>
      </div>
    </div>
  );
}
