import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";

const PresentationViewer = lazy(() =>
  import("./PresentationViewer").then((m) => ({ default: m.PresentationViewer })),
);

interface LazyPresentationViewerProps {
  fileUrl: string;
  fileName?: string;
  initialSlide?: number;
  allowDownload?: boolean;
  onSlideChange?: (index: number, total: number) => void;
  onReachEnd?: () => void;
  className?: string;
}

export function LazyPresentationViewer(props: LazyPresentationViewerProps) {
  return (
    <Suspense
      fallback={
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${props.className || ""}`}>
          <LoadingState message="Loading presentation viewer..." size="lg" />
        </div>
      }
    >
      <PresentationViewer {...props} />
    </Suspense>
  );
}
