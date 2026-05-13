# Fix the Mux video player

## Problem

In `client/src/components/ui/video-player.tsx`, when a lesson is a Mux video the wrapper renders:
1. The official `<MuxPlayer>` component — which ships with **its own** play/pause button, scrub bar, time display, volume, settings, and fullscreen UI.
2. Our **custom** overlay on top — center play button, bottom control bar, scrub bar, time `0:00 / 0:00`, settings, fullscreen — driven by local state.

That is the "two video players" the user sees. It also explains the missing duration: our custom bar reads duration from `e.target.duration` on `onLoadedMetadata`, but `@mux/mux-player-react` does not always populate `e.target.duration` on that event in the same way HTML5 `<video>` does, so the bottom strip stays at `0:00`. The Mux player's own UI shows the correct duration — it is just hidden behind our overlay.

## Fix

When `videoPlatform === "mux"`, render **only** the Mux Player with its native controls and skip every piece of the custom UI. For all other sources (HTML5, YouTube, Vimeo) keep the existing behavior unchanged.

### Changes in `client/src/components/ui/video-player.tsx`

1. Add an early-return branch inside the component's `return (...)` so that when `videoPlatform === "mux"` the JSX is only:
   - `wrapperRef` div with the same outer classes (aspect-video, rounded, fullscreen handling, theatre handling).
   - A single `<MuxPlayer>` filling the wrapper with `controls` left at default (its built-in UI), accent color set to brand crimson via `--media-primary-color: #B91C1C`, `streamType="on-demand"`, `playbackId={muxPlaybackId}`, `poster`, `metadata={{ video_title: title }}`, `startTime={startAt}`.
   - Wire its events to still call the parent props: `onPlay`, `onPause`, `onEnded`, `onError`, `onCanPlay`, `onLoadedMetadata`, `onTimeUpdate`. Update local `currentTime`/`duration` state from these so the imperative ref (`videoRef.current.duration`) keeps working for the page that records progress.
   - Expose `play()` / `pause()` via the existing `useImperativeHandle` by reading from `muxPlayerRef.current` (already declared).
   - Skip: the loading spinner overlay, the center play button, the prev/next side buttons, the bottom controls bar, the title overlay, the keyboard shortcut handler, and the auto-hide controls timer (Mux Player handles all of this itself).

2. Keep the existing non-Mux render path exactly as it is so YouTube, Vimeo, and HTML5 video continue to use the custom overlay.

3. Read duration directly from the Mux player element on `loadedmetadata` (`e.target.duration`) **and** also listen to its `durationchange` event (Mux fires this once HLS manifest is parsed) so the parent always gets the real value for progress tracking.

### Why this matches the user's request

- "Use the mux player only for mux videos" → done; for Mux we render only `<MuxPlayer>` with no custom overlay.
- "Two video players being played" → eliminated because there is now only one set of controls.
- "Duration is not being pulled or shown" → the Mux Player's own time display shows duration correctly, and we also push it back through `onLoadedMetadata` / `durationchange` for any progress logic that depends on it.

## Files touched

- `client/src/components/ui/video-player.tsx` (only file).

No DB, no edge functions, no other components affected. `lazy-video-player.tsx` and `pages/video-player.tsx` already pass `videoPlatform="mux"` and `muxPlaybackId` correctly, so no call-site changes are needed.
