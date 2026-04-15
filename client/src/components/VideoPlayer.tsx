import { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  videoUrl?: string;
  videoPlatform?: 'youtube' | 'vimeo';
  videoId?: string;
  className?: string;
  onError?: (error: string) => void;
}

export function VideoPlayer({ 
  videoUrl, 
  videoPlatform, 
  videoId, 
  className = "",
  onError 
}: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Determine if this is an external video or uploaded file
  const isExternal = videoPlatform && videoId;
  const isUpload = videoUrl && !isExternal;

  useEffect(() => {
    if (!isExternal && !isUpload) {
      setError("No video source provided");
      onError?.("No video source provided");
      return;
    }

    setError(null);
    setIsLoading(true);
  }, [videoUrl, videoPlatform, videoId, isExternal, isUpload, onError]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    let errorMessage = isExternal 
      ? `Failed to load ${videoPlatform} video` 
      : "Failed to load video file";
    
    // Add specific guidance based on platform
    if (isExternal && videoPlatform === 'youtube') {
      errorMessage += ". The video may be private, removed, or region-restricted.";
    } else if (isExternal && videoPlatform === 'vimeo') {
      errorMessage += ". The video may be private or requires a password.";
    } else if (!isExternal) {
      errorMessage += ". Please check your connection and try again.";
    }
    
    setError(errorMessage);
    onError?.(errorMessage);
    setIsLoading(false);
  };

  // Generate embed URL for external videos
  const getEmbedUrl = () => {
    if (!videoPlatform || !videoId) return null;
    
    if (videoPlatform === 'youtube') {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    } else if (videoPlatform === 'vimeo') {
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return null;
  };

  if (error) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // External video (YouTube/Vimeo)
  if (isExternal) {
    const embedUrl = getEmbedUrl();
    if (!embedUrl) {
      return (
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}>
          <p className="text-sm text-muted-foreground">Invalid video configuration</p>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${className}`}>
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
            title="Video player"
          />
        </div>
      </div>
    );
  }

  // Uploaded video file
  if (isUpload) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <video
            className="w-full h-full"
            controls
            preload="metadata"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    );
  }

  return null;
}
