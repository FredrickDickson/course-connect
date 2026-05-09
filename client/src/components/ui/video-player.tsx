"use client";

import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useFocusManagement, keyboardNavigation } from "@/lib/focus-management";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, Volume2, Volume1, VolumeX,
  RotateCcw, RotateCw, Maximize, Minimize, Settings,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ss = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface ScrubBarProps {
  current: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
}

const ScrubBar: React.FC<ScrubBarProps> = ({ current, duration, buffered, onSeek }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const pctFromEvent = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };
  const seekFromEvent = (clientX: number) => {
    if (!duration) return;
    onSeek(pctFromEvent(clientX) * duration);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => seekFromEvent(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, duration]);

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={barRef}
      className="group relative w-full py-2 cursor-pointer touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={(e) => setHoverPct(pctFromEvent(e.clientX))}
      onPointerLeave={() => setHoverPct(null)}
    >
      <div className="relative h-1 group-hover:h-1.5 transition-all bg-white/25 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${bufferedPct}%` }} />
        <div className="absolute inset-y-0 left-0 bg-[#B91C1C]" style={{ width: `${progressPct}%` }} />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `calc(${progressPct}% - 7px)` }}
      />
      {hoverPct !== null && duration > 0 && (
        <div
          className="absolute -top-7 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-medium pointer-events-none -translate-x-1/2"
          style={{ left: `${hoverPct * 100}%` }}
        >
          {formatTime(hoverPct * duration)}
        </div>
      )}
    </div>
  );
};

export interface VideoPlayerProps {
  src?: string;
  videoUrl?: string;
  videoPlatform?: "youtube" | "vimeo";
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

export interface VideoPlayerRef {
  videoElement: HTMLVideoElement | null;
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
}

// ---------- YouTube IFrame API loader ----------
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("ssr");
  if ((window as any).YT && (window as any).YT.Player) return Promise.resolve((window as any).YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve((window as any).YT);
    };
  });
  return ytApiPromise;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  const {
    src, videoUrl, videoPlatform, videoId, poster, title, startAt = 0,
    onTimeUpdate, onLoadedMetadata, onPlay, onPause, onEnded, onError, onLoadStart, onCanPlay,
    onPrev, onNext, className,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const externalContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const vimeoPlayerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);
  const seekedRef = useRef(false);
  const hideTimer = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheatre, setIsTheatre] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const actualSrc = src || videoUrl;
  const isExternal = !!(videoPlatform && videoId && videoId.length > 0);

  // ---------- Adapter functions ----------
  const adapterPlay = () => {
    if (videoPlatform === "youtube") ytPlayerRef.current?.playVideo?.();
    else if (videoPlatform === "vimeo") vimeoPlayerRef.current?.play?.();
    else videoRef.current?.play();
  };
  const adapterPause = () => {
    if (videoPlatform === "youtube") ytPlayerRef.current?.pauseVideo?.();
    else if (videoPlatform === "vimeo") vimeoPlayerRef.current?.pause?.();
    else videoRef.current?.pause();
  };
  const adapterSeek = (t: number) => {
    if (videoPlatform === "youtube") ytPlayerRef.current?.seekTo?.(t, true);
    else if (videoPlatform === "vimeo") vimeoPlayerRef.current?.setCurrentTime?.(t);
    else if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };
  const adapterSetVolume = (v: number) => {
    if (videoPlatform === "youtube") {
      ytPlayerRef.current?.setVolume?.(Math.round(v * 100));
      if (v === 0) ytPlayerRef.current?.mute?.(); else ytPlayerRef.current?.unMute?.();
    } else if (videoPlatform === "vimeo") {
      vimeoPlayerRef.current?.setVolume?.(v);
    } else if (videoRef.current) {
      videoRef.current.volume = v; videoRef.current.muted = v === 0;
    }
    setVolume(v); setIsMuted(v === 0);
  };
  const adapterToggleMute = () => {
    const next = !isMuted;
    if (videoPlatform === "youtube") {
      next ? ytPlayerRef.current?.mute?.() : ytPlayerRef.current?.unMute?.();
    } else if (videoPlatform === "vimeo") {
      vimeoPlayerRef.current?.setMuted?.(next);
    } else if (videoRef.current) {
      videoRef.current.muted = next;
    }
    setIsMuted(next);
  };
  const adapterSetRate = (r: number) => {
    if (videoPlatform === "youtube") ytPlayerRef.current?.setPlaybackRate?.(r);
    else if (videoPlatform === "vimeo") vimeoPlayerRef.current?.setPlaybackRate?.(r);
    else if (videoRef.current) videoRef.current.playbackRate = r;
    setSpeedState(r);
  };

  const togglePlay = () => { isPlaying ? adapterPause() : adapterPlay(); };
  const skip = (delta: number) => adapterSeek(Math.min(Math.max(currentTime + delta, 0), duration || 0));

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!isFullscreen) {
      wrapperRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const toggleCaptions = () => {
    // Placeholder for captions toggle - would need implementation based on video source
    console.log('Toggle captions');
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle escape to exit fullscreen
    if (keyboardNavigation.handleEscape(e, () => {
      if (isFullscreen) {
        toggleFullscreen();
      }
    })) {
      return;
    }

    // Handle video control shortcuts
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        adapterToggleMute();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(5);
        break;
      case 'j':
        e.preventDefault();
        skip(-10);
        break;
      case 'l':
        e.preventDefault();
        skip(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        adapterSetVolume(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        adapterSetVolume(Math.max(0, volume - 0.1));
        break;
      case 'c':
        e.preventDefault();
        toggleCaptions();
        break;
    }
  }, [isFullscreen, togglePlay, toggleFullscreen, adapterToggleMute, skip, adapterSetVolume, volume, toggleCaptions]);

  // Add keyboard event listeners
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Imperative API
  useImperativeHandle(ref, () => ({
    videoElement: videoRef.current,
    play: () => adapterPlay(),
    pause: () => adapterPause(),
    get currentTime() { return currentTime; },
    get duration() { return duration; },
  }), [currentTime, duration]);

  // ---------- Auto-hide controls ----------
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);
  const reveal = useCallback(() => { setShowControls(true); scheduleHide(); }, [scheduleHide]);
  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  // ---------- Fullscreen listener ----------
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------- Mount external players ----------
  useEffect(() => {
    if (!isExternal) return;
    let cancelled = false;
    setIsLoading(true);
    seekedRef.current = false;

    (async () => {
      if (videoPlatform === "youtube") {
        try {
          const YT = await loadYouTubeApi();
          if (cancelled || !externalContainerRef.current) return;
          // Clear container
          externalContainerRef.current.innerHTML = "";
          const div = document.createElement("div");
          div.id = `yt-${videoId}-${Math.random().toString(36).slice(2)}`;
          externalContainerRef.current.appendChild(div);
          ytPlayerRef.current = new YT.Player(div.id, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: {
              controls: 0, modestbranding: 1, rel: 0, playsinline: 1,
              disablekb: 1, fs: 0, iv_load_policy: 3, autoplay: 0,
              color: "white", autohide: 1,
            },
            events: {
              onReady: (e: any) => {
                setDuration(e.target.getDuration() || 0);
                setVolume((e.target.getVolume() || 100) / 100);
                if (startAt > 0 && !seekedRef.current) {
                  e.target.seekTo(startAt, true);
                  seekedRef.current = true;
                }
                try {
                  const ifr = e.target.getIframe?.() as HTMLIFrameElement | undefined;
                  if (ifr) {
                    ifr.removeAttribute("width");
                    ifr.removeAttribute("height");
                    ifr.setAttribute("allowfullscreen", "true");
                    ifr.setAttribute(
                      "allow",
                      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    );
                    ifr.style.width = "100%";
                    ifr.style.height = "100%";
                    ifr.style.border = "0";
                  }
                } catch {}
                setIsLoading(false);
                onLoadedMetadata?.();
              },
              onStateChange: (e: any) => {
                const s = e.data;
                if (s === YT.PlayerState.PLAYING) { setIsPlaying(true); onPlay?.(); scheduleHide(); }
                else if (s === YT.PlayerState.PAUSED) { setIsPlaying(false); onPause?.(); setShowControls(true); }
                else if (s === YT.PlayerState.ENDED) { setIsPlaying(false); onEnded?.(); setShowControls(true); }
              },
              onError: () => { setError("Failed to load YouTube video"); onError?.(); setIsLoading(false); },
            },
          });
        } catch {
          setError("Could not load YouTube player");
          setIsLoading(false);
        }
      } else if (videoPlatform === "vimeo") {
        try {
          const Vimeo = (await import("@vimeo/player")).default;
          if (cancelled || !externalContainerRef.current) return;
          externalContainerRef.current.innerHTML = "";
          vimeoPlayerRef.current = new Vimeo(externalContainerRef.current, {
            id: Number(videoId),
            controls: false,
            responsive: false,
            playsinline: true,
            autopause: false,
            transparent: false,
            dnt: true,
            title: false,
            byline: false,
            portrait: false,
          } as any);
          await vimeoPlayerRef.current.ready();
          try {
            const ifr = externalContainerRef.current.querySelector("iframe") as HTMLIFrameElement | null;
            if (ifr) {
              ifr.removeAttribute("width");
              ifr.removeAttribute("height");
              ifr.setAttribute("allowfullscreen", "true");
              ifr.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; clipboard-write");
              ifr.style.position = "absolute";
              ifr.style.top = "0";
              ifr.style.left = "0";
              ifr.style.width = "100%";
              ifr.style.height = "100%";
              ifr.style.border = "0";
            }
          } catch {}
          const dur = await vimeoPlayerRef.current.getDuration();
          setDuration(dur || 0);
          if (startAt > 0 && !seekedRef.current) {
            await vimeoPlayerRef.current.setCurrentTime(startAt);
            seekedRef.current = true;
          }
          setIsLoading(false);
          onLoadedMetadata?.();
          vimeoPlayerRef.current.on("timeupdate", (d: any) => {
            setCurrentTime(d.seconds);
            onTimeUpdate?.();
          });
          vimeoPlayerRef.current.on("play", () => { setIsPlaying(true); onPlay?.(); scheduleHide(); });
          vimeoPlayerRef.current.on("pause", () => { setIsPlaying(false); onPause?.(); setShowControls(true); });
          vimeoPlayerRef.current.on("ended", () => { setIsPlaying(false); onEnded?.(); setShowControls(true); });
        } catch {
          setError("Could not load Vimeo player");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { ytPlayerRef.current?.destroy?.(); } catch {}
      try { vimeoPlayerRef.current?.destroy?.(); } catch {}
      ytPlayerRef.current = null;
      vimeoPlayerRef.current = null;
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternal, videoPlatform, videoId]);

  // ---------- YouTube polling for time updates ----------
  useEffect(() => {
    if (videoPlatform !== "youtube" || !isPlaying) return;
    pollRef.current = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p?.getCurrentTime) return;
      try {
        setCurrentTime(p.getCurrentTime() || 0);
        const d = p.getDuration() || 0;
        if (d && d !== duration) setDuration(d);
        onTimeUpdate?.();
      } catch {}
    }, 500);
    return () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPlatform, isPlaying]);

  // ---------- Native: apply startAt once metadata loaded ----------
  useEffect(() => {
    if (isExternal) return;
    seekedRef.current = false;
  }, [isExternal, actualSrc]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!wrapperRef.current?.contains(document.activeElement) && !wrapperRef.current?.matches(":hover")) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": skip(-5); break;
        case "ArrowRight": skip(5); break;
        case "ArrowUp": e.preventDefault(); adapterSetVolume(Math.min(volume + 0.1, 1)); break;
        case "ArrowDown": e.preventDefault(); adapterSetVolume(Math.max(volume - 0.1, 0)); break;
        case "f": case "F": toggleFullscreen(); break;
        case "m": case "M": adapterToggleMute(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isPlaying, currentTime, duration]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "group/player relative w-full bg-black overflow-hidden select-none",
        "aspect-video",
        isTheatre && !isFullscreen && "!aspect-auto h-[calc(100vh-8rem)]",
        isFullscreen && "!aspect-auto h-screen",
        !isFullscreen && "rounded-lg",
        className,
      )}
      onMouseMove={reveal}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      onTouchStart={reveal}
      tabIndex={0}
    >
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="text-center text-white p-4"><p className="text-sm">{error}</p></div>
        </div>
      )}
      {isLoading && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Media surface */}
      {isExternal ? (
        <div
          ref={externalContainerRef}
          className="absolute inset-0 w-full h-full [&_iframe]:absolute [&_iframe]:top-0 [&_iframe]:left-0 [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:border-0"
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          poster={poster}
          src={actualSrc}
          playsInline
          onClick={togglePlay}
          onTimeUpdate={() => {
            const v = videoRef.current; if (!v) return;
            setCurrentTime(v.currentTime);
            if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
            onTimeUpdate?.();
          }}
          onLoadedMetadata={() => {
            const v = videoRef.current; if (!v) return;
            setDuration(v.duration);
            if (startAt > 0 && !seekedRef.current && startAt < v.duration - 1) {
              try { v.currentTime = startAt; } catch {}
              seekedRef.current = true;
            }
            onLoadedMetadata?.();
          }}
          onPlay={() => { setIsPlaying(true); scheduleHide(); onPlay?.(); }}
          onPause={() => { setIsPlaying(false); setShowControls(true); onPause?.(); }}
          onEnded={() => { setIsPlaying(false); setShowControls(true); onEnded?.(); }}
          onVolumeChange={() => {
            const v = videoRef.current; if (!v) return;
            setVolume(v.volume); setIsMuted(v.muted);
          }}
          onError={() => { setError("Failed to load video"); setIsLoading(false); onError?.(); }}
          onLoadStart={() => { setIsLoading(true); onLoadStart?.(); }}
          onCanPlay={() => { setIsLoading(false); onCanPlay?.(); }}
        />
      )}

      {/* Click-capture overlay for external players (so click toggles play) */}
      {isExternal && !error && (
        <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />
      )}

      {/* Title (top-left) */}
      <AnimatePresence>
        {title && showControls && (
          <motion.div
            id="video-title"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent text-white text-sm font-medium pointer-events-none"
            role="status"
            aria-live="polite"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play overlay */}
      <AnimatePresence>
        {!isPlaying && !isLoading && !error && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            className="absolute inset-0 m-auto h-20 w-20 sm:h-20 sm:w-20 z-20 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/75 active:bg-black/80 text-white touch-none"
            aria-label={isPlaying ? "Pause video" : "Play video"}
            aria-describedby="video-title"
            style={{ minHeight: '80px', minWidth: '80px' }}
          >
            <Play className="h-10 w-10 sm:h-10 sm:w-10 fill-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Side prev/next */}
      {onPrev && (
        <button
          onClick={onPrev}
          aria-label="Previous lesson"
          className={cn(
            "flex sm:hidden absolute left-2 top-1/2 -translate-y-1/2 z-20 h-14 w-14 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 text-white transition-opacity touch-none",
            showControls ? "opacity-100" : "opacity-0",
          )}
          style={{ minHeight: '56px', minWidth: '56px' }}
        ><ChevronLeft className="h-7 w-7" /></button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          aria-label="Next lesson"
          className={cn(
            "flex sm:hidden absolute right-2 top-1/2 -translate-y-1/2 z-20 h-14 w-14 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 text-white transition-opacity touch-none",
            showControls ? "opacity-100" : "opacity-0",
          )}
          style={{ minHeight: '56px', minWidth: '56px' }}
        ><ChevronRight className="h-7 w-7" /></button>
      )}
      {/* Desktop prev/next */}
      {onPrev && (
        <button
          onClick={onPrev}
          aria-label="Previous lesson"
          className={cn(
            "hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-opacity",
            showControls ? "opacity-100" : "opacity-0",
          )}
        ><ChevronLeft className="h-6 w-6" /></button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          aria-label="Next lesson"
          className={cn(
            "hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-opacity",
            showControls ? "opacity-100" : "opacity-0",
          )}
        ><ChevronRight className="h-6 w-6" /></button>
      )}

      {/* Controls bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 z-20 px-2 sm:px-4 pb-2 pt-8 bg-gradient-to-t from-black/85 via-black/50 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <ScrubBar current={currentTime} duration={duration} buffered={buffered} onSeek={adapterSeek} />

            <div className="flex items-center gap-2 sm:gap-3 text-white">
              <Button onClick={togglePlay} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white active:bg-white/20 min-h-12 min-w-12 sm:min-h-11 sm:min-w-11 lg:min-h-9 lg:min-w-9 touch-none">
                {isPlaying ? <Pause className="h-5 w-5 sm:h-5 sm:w-5 lg:h-4 lg:w-4" /> : <Play className="h-5 w-5 sm:h-5 sm:w-5 lg:h-4 lg:w-4 fill-white" />}
              </Button>

              {onPrev && (
                <Button onClick={onPrev} variant="ghost" size="icon" className="flex sm:hidden text-white hover:bg-white/10 hover:text-white active:bg-white/20 min-h-12 min-w-12 touch-none" aria-label="Previous lesson">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {onNext && (
                <Button onClick={onNext} variant="ghost" size="icon" className="flex sm:hidden text-white hover:bg-white/10 hover:text-white active:bg-white/20 min-h-12 min-w-12 touch-none" aria-label="Next lesson">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              <Button onClick={() => skip(-10)} variant="ghost" size="icon" className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white active:bg-white/20 min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 touch-none" aria-label="Rewind 10 seconds">
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button onClick={() => skip(10)} variant="ghost" size="icon" className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white active:bg-white/20 min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 touch-none" aria-label="Forward 10 seconds">
                <RotateCw className="h-5 w-5" />
              </Button>

              <div
                className="hidden sm:flex items-center"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <Button onClick={adapterToggleMute} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : volume > 0.5 ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
                </Button>
                <div className={cn("overflow-hidden transition-all", showVolumeSlider ? "w-20 ml-1" : "w-0")}>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => adapterSetVolume(parseFloat(e.target.value))}
                    className="w-full accent-[#B91C1C] cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>
              <Button onClick={adapterToggleMute} variant="ghost" size="icon" className="sm:hidden text-white hover:bg-white/10 hover:text-white min-h-11 min-w-11">
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              <span className="text-xs sm:text-sm tabular-nums px-1">
                {formatTime(currentTime)} <span className="text-white/60">/ {formatTime(duration)}</span>
              </span>

              <div className="ml-auto flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white min-h-11 min-w-11 lg:min-h-9 lg:min-w-9" aria-label="Settings">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-neutral-900 text-white border-neutral-700 z-[9999]">
                    <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-neutral-700" />
                    {SPEEDS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => adapterSetRate(s)}
                        className={cn("focus:bg-white/10 focus:text-white cursor-pointer", speed === s && "bg-white/10")}
                      >
                        {s === 1 ? "Normal" : `${s}x`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={() => setIsTheatre((t) => !t)}
                  variant="ghost" size="icon"
                  className="hidden md:inline-flex text-white hover:bg-white/10 hover:text-white"
                  aria-label="Theatre mode"
                >
                  {isTheatre ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>

                <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white min-h-11 min-w-11 lg:min-h-9 lg:min-w-9" aria-label="Fullscreen">
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
