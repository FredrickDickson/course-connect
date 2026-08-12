import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Download, LayoutGrid, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import pdfjsLib from "@/lib/pdfjs";

interface PresentationViewerProps {
  fileUrl: string;
  fileName?: string;
  initialSlide?: number;
  allowDownload?: boolean;
  onSlideChange?: (index: number, total: number) => void;
  onReachEnd?: () => void;
  className?: string;
}

export function PresentationViewer({
  fileUrl,
  fileName,
  initialSlide = 0,
  allowDownload = false,
  onSlideChange,
  onReachEnd,
  className,
}: PresentationViewerProps) {
  const [doc, setDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(Math.max(initialSlide, 0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartXRef = useRef<number | null>(null);
  const reachedEndRef = useRef(false);

  // Load the document once per fileUrl
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reachedEndRef.current = false;

    pdfjsLib
      .getDocument({ url: fileUrl })
      .promise.then((pdf) => {
        if (cancelled) return;
        setDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentIndex(Math.min(Math.max(initialSlide, 0), pdf.numPages - 1));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load presentation:", err);
        setError("Failed to load this presentation. Please try again later.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  const renderPage = useCallback(async () => {
    if (!doc || !canvasRef.current || !containerRef.current) return;
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }

    const page = await doc.getPage(currentIndex + 1);
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 600;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(containerWidth / baseViewport.width, containerHeight / baseViewport.height);
    const viewport = page.getViewport({ scale: scale > 0 ? scale : 1 });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Render at device-pixel resolution and pin the CSS size to the fit size,
    // otherwise high-DPR (mobile) screens upscale a 1x backing store and slides look blurry.
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    const renderTask = page.render({ canvasContext: context, viewport, transform });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Failed to render slide:", err);
      }
    }
  }, [doc, currentIndex]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  useEffect(() => {
    const onResize = () => renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  useEffect(() => {
    if (!numPages) return;
    onSlideChange?.(currentIndex, numPages);
    if (currentIndex === numPages - 1 && !reachedEndRef.current) {
      reachedEndRef.current = true;
      onReachEnd?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, numPages]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(() => Math.min(Math.max(index, 0), Math.max(numPages - 1, 0)));
    },
    [numPages],
  );
  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!isFullscreen) {
      wrapperRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
    touchStartXRef.current = null;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-destructive" data-testid="text-presentation-error">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg overflow-hidden border",
        isFullscreen && "fixed inset-0 z-50 rounded-none bg-black",
        className,
      )}
      data-testid="presentation-viewer"
    >
      <div className="flex-1 flex overflow-hidden min-h-[300px]">
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <canvas ref={canvasRef} className="max-w-full max-h-full shadow-md rounded bg-white" />
          )}
        </div>
        {showThumbnails && doc && (
          <ThumbnailPanel doc={doc} numPages={numPages} currentIndex={currentIndex} onSelect={goTo} />
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t bg-background flex-wrap">
        <Button variant="ghost" size="sm" onClick={goPrev} disabled={currentIndex === 0} data-testid="button-prev-slide">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-sm font-medium text-muted-foreground mx-1" data-testid="text-slide-counter">
          Slide {numPages ? currentIndex + 1 : 0} / {numPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          disabled={numPages === 0 || currentIndex >= numPages - 1}
          data-testid="button-next-slide"
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowThumbnails((v) => !v)}
          aria-label="Slide navigator"
          data-testid="button-slide-navigator"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        {allowDownload && (
          <Button variant="ghost" size="icon" asChild aria-label="Download presentation" data-testid="button-download-presentation">
            <a href={fileUrl} download={fileName || true}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Fullscreen" data-testid="button-fullscreen">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ThumbnailPanel({
  doc,
  numPages,
  currentIndex,
  onSelect,
}: {
  doc: any;
  numPages: number;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const [thumbs, setThumbs] = useState<(string | null)[]>(() => new Array(numPages).fill(null));

  useEffect(() => {
    let cancelled = false;
    setThumbs(new Array(numPages).fill(null));

    (async () => {
      for (let i = 0; i < numPages; i++) {
        if (cancelled) return;
        try {
          const page = await doc.getPage(i + 1);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          const url = canvas.toDataURL();
          setThumbs((prev) => {
            const next = [...prev];
            next[i] = url;
            return next;
          });
        } catch {
          // ignore individual thumbnail render failures
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, numPages]);

  return (
    <div className="w-40 sm:w-48 border-l bg-background overflow-y-auto shrink-0" data-testid="panel-slide-thumbnails">
      <div className="p-2 space-y-2">
        {Array.from({ length: numPages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "w-full aspect-video rounded border overflow-hidden bg-muted flex items-center justify-center text-xs text-muted-foreground hover:border-primary transition-colors",
              i === currentIndex && "ring-2 ring-primary border-primary",
            )}
            data-testid={`button-thumbnail-${i + 1}`}
          >
            {thumbs[i] ? (
              <img src={thumbs[i]!} alt={`Slide ${i + 1}`} className="w-full h-full object-contain" />
            ) : (
              <span>{i + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
