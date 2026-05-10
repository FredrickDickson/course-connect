import { lazy, Suspense, forwardRef } from "react";
import { LoadingState } from "./loading-state";

const VideoPlayer = lazy(() => import("./video-player"));

interface LazyVideoPlayerProps {
  src?: string;
  videoUrl?: string;
  videoPlatform?: 'youtube' | 'vimeo' | 'mux';
  videoId?: string;
  muxPlaybackId?: string;
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

export const LazyVideoPlayer = forwardRef<any, LazyVideoPlayerProps>((props, ref) => {
  return (
    <Suspense 
      fallback={
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${props.className || ""}`}>
          <LoadingState message="Loading video player..." size="lg" />
        </div>
      }
    >
      <VideoPlayer {...props} ref={ref} />
    </Suspense>
  );
});

LazyVideoPlayer.displayName = "LazyVideoPlayer";

export type VideoPlayerRef = any;
export { VideoPlayer };
