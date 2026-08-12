import { cn } from "@/lib/utils";

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackSrc?: string;
  testId?: string;
}

// Renders the full, uncropped course thumbnail (object-contain) on top of a
// blurred, zoomed copy of the same image filling the box behind it — avoids
// both cropping the source image and showing flat letterbox bars when the
// image's aspect ratio doesn't match the card.
export function CourseThumbnail({ src, alt, className, imgClassName, fallbackSrc, testId }: CourseThumbnailProps) {
  const url = src || fallbackSrc;

  if (!url) {
    return <div className={cn("bg-muted", className)} />;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className={cn("absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60 saturate-150", imgClassName)}
      />
      <div className="absolute inset-0 bg-black/10" />
      <img src={url} alt={alt} loading="lazy" data-testid={testId} className="relative w-full h-full object-contain" />
    </div>
  );
}
