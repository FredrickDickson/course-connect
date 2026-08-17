import { cn } from "@/lib/utils";

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackSrc?: string;
  testId?: string;
}

// Renders course thumbnails that fill the entire card area using object-cover.
// The image will be cropped to fit the aspect ratio of the card, ensuring no
// blank spaces appear regardless of the original image dimensions.
export function CourseThumbnail({ src, alt, className, imgClassName, fallbackSrc, testId }: CourseThumbnailProps) {
  const url = src || fallbackSrc;

  if (!url) {
    return <div className={cn("bg-muted", className)} />;
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img 
        src={url} 
        alt={alt} 
        loading="lazy" 
        data-testid={testId} 
        className={cn("w-full h-full object-cover", imgClassName)} 
      />
    </div>
  );
}
