## Goal

Replace the current custom controls in `client/src/components/ui/video-player.tsx` with a Udemy-style player for **native (Supabase-hosted) videos only**. YouTube and Vimeo embeds keep their own players (their TOS requires it) — we just make the iframe wrapper fully responsive.

## Scope

- File touched: `client/src/components/ui/video-player.tsx` (single file rewrite of the native branch + responsive wrapper)
- No DB changes, no new deps (uses existing `framer-motion`, `lucide-react`, shadcn `Button`, `Slider` already in project)
- No changes to `videoUrl`/`videoPlatform`/`videoId` prop API — every existing caller (`video-player.tsx` page, lesson preview, etc.) keeps working

## Player anatomy (matches Udemy reference screenshots)

```text
┌──────────────────────────────────────────────┐
│  (16:9 black stage, video fills width)       │
│                                              │
│  ◀ prev          ▶ big center play       ▶  │  ← side prev/next arrows (only when handlers passed)
│                                              │
│  ╶─────────────●──────────────────────────╴  │  ← scrub bar, full width, crimson fill
│  ▶ ↻10 1x ↻10  0:23 / 12:45    🔊 📝 ⚙ ⛶ ⤢ │  ← bottom control bar
└──────────────────────────────────────────────┘
```

### Bottom control bar (left → right)

- Play / Pause toggle
- Rewind 10s (`SkipBack` icon, jumps `currentTime -= 10`)
- Speed pill (`1x`) — click opens menu: 0.5 / 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2
- Forward 10s (`SkipForward`)
- Time readout `currentTime / duration` (formatted MM:SS or H:MM:SS)
- Spacer
- Volume button + horizontal slider on hover (collapses on mobile to just a tap-to-mute icon)
- Captions toggle (`Captions` icon — wired to `<track>` if present, hidden if no tracks)
- Settings cog (quality/speed dropdown — quality only listed if multiple sources passed; otherwise just speed)
- Theatre / Expanded view toggle (`Maximize2` icon — toggles a `theatre` className that widens player to viewport width while staying in-page)
- Fullscreen toggle (`Maximize` icon — uses `requestFullscreen()` on the player wrapper, switches icon to `Minimize` when active)

### Side navigation arrows

- Big translucent purple/crimson circular arrows on left/right edges, vertically centered, only render when parent passes `onPrev` / `onNext` props (so the lesson page's prev/next can live on the player itself, like Udemy)
- Hidden on touch devices unless controls visible

### Scrub bar

- Full width above the bottom bar
- Crimson `#B91C1C` filled portion, white scrubber thumb, dark grey track
- Buffered range shown in lighter grey (uses `video.buffered`)
- Hover anywhere on the bar shows a tooltip with target timestamp

### Center play overlay

- Large translucent circular Play button when paused, fades on play
- Tap/click anywhere on video toggles play/pause (existing behaviour kept)

## Responsive behaviour

- Wrapper always uses `aspect-video w-full` — fills container, no fixed widths
- Controls bar uses `flex flex-wrap` with priority: Play / time / fullscreen always visible; speed/captions/settings collapse into an overflow `⋮` menu under 480px
- Touch-friendly: every control is min `44x44px` on `<lg` (Tailwind `min-h-11 min-w-11 lg:min-h-9 lg:min-w-9`)
- Volume slider hidden under `sm`, replaced by tap-to-mute
- Side prev/next arrows become bottom-bar buttons under `sm`
- Controls auto-hide after 3s of inactivity while playing; tap/mouse-move reveals
- Keyboard shortcuts: Space = play/pause, ←/→ = ±5s, ↑/↓ = volume, F = fullscreen, M = mute (desktop only)

## YouTube / Vimeo branch

Already uses iframe + `aspect-video` wrapper. Only fix: ensure the wrapper has no `max-width` and inherits parent width so it's fully responsive on mobile (currently fine, just verify). No control overlay added — their players handle controls.

## New props (all optional, additive)

```ts
interface VideoPlayerProps {
  // existing...
  onPrev?: () => void;     // shows left arrow
  onNext?: () => void;     // shows right arrow
  onEnded?: () => void;    // for auto-advance in lesson page
  poster?: string;         // thumbnail before first play
  title?: string;          // shown faintly top-left
}
```

## Out of scope

- Picture-in-picture (can add later via `requestPictureInPicture()` if requested)
- Adaptive bitrate / HLS — Supabase serves single-resolution MP4, so no quality switcher unless the lesson record provides multiple sources
- Custom controls over YouTube/Vimeo (against their embed TOS)
- Player analytics / heatmaps

## Acceptance check

After build, manually verify in preview at desktop, tablet (768px), and mobile (375px) widths:
1. Player fills available width with 16:9 ratio
2. All controls reachable with one tap on mobile
3. Fullscreen works on iOS Safari (uses `webkitEnterFullscreen` fallback)
4. Theatre mode widens to viewport width without breaking page scroll
5. YouTube/Vimeo embeds remain their own players, just responsive

Approve and I'll switch to build mode and rewrite the file.
