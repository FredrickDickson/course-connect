import { lazy, Suspense } from "react";
import { LoadingState } from "./loading-state";

const VideoPlayer = lazy(() => import("./video-player"));

interface LazyVideoPlayerProps {
  src?: string;
  videoUrl?: string;
  videoPlatform?: 'youtube' | 'vimeo';
  videoId?: string;
  poster?: string;
  title?: string;
  startAt?: number;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
}

export function LazyVideoPlayer(props: LazyVideoPlayerProps) {
  return (
    <Suspense 
      fallback={
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${props.className || ""}`}>
          <LoadingState message="Loading video player..." size="lg" />
        </div>
      }
    >
      <VideoPlayer {...props} />
    </Suspense>
  );
}

export type VideoPlayerRef = any;
export { VideoPlayer };
