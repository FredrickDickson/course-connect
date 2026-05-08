## Goal
Fix YouTube embeds appearing too small and Vimeo embeds appearing zoomed/cropped on `/learn/:courseId/:lessonId`. Keep the existing unified Udemy-style custom controls (already approved earlier) — only fix the underlying iframe sizing.

## Root cause
`client/src/components/ui/video-player.tsx` mounts external players into a `<div ref={externalContainerRef} className="absolute inset-0 w-full h-full" />`:

- **YouTube**: `new YT.Player(div.id, { videoId, playerVars: ... })` is called without `width`/`height`. The YouTube IFrame API replaces the div with an `<iframe>` that defaults to `width="640" height="360"` attributes, so the iframe is a small fixed box inside a full-size container → "video too small."
- **Vimeo**: `new Vimeo(container, { responsive: true, ... })` injects its own `padding-bottom: 56.25%` wrapper. Because the parent already has `aspect-video` + `absolute inset-0`, the responsive-mode wrapper computes height against the parent width, then the player letter-pillarbox math collides with the fixed container height → visible zoom/crop. Also `transparent` is not explicitly set.

The outer `aspect-video` wrapper itself is correct and matches the user's `pb-[56.25%]` intent.

## Fix (file: `client/src/components/ui/video-player.tsx`)

1. **Force injected iframes to fill the container.** Add a CSS rule to the external container so that any nested `iframe` (whether injected by YT API or Vimeo SDK) is absolutely sized 100%/100% with no border:

   ```tsx
   <div
     ref={externalContainerRef}
     className="absolute inset-0 w-full h-full
                [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0
                [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0
                [&_iframe]:!w-full [&_iframe]:!h-full"
   />
   ```

2. **YouTube — pass explicit 100% sizing and richer playerVars.** In the `new YT.Player(...)` call:
   - Add `width: "100%"`, `height: "100%"`.
   - Extend `playerVars` with `color: "white"`, `autohide: 1` (existing `modestbranding`, `rel:0`, `iv_load_policy:3`, `playsinline:1`, `controls:0`, `disablekb:1`, `fs:0` stay).
   - After `onReady`, also call `e.target.getIframe().setAttribute("allowfullscreen", "true")` and remove any width/height attributes the API may have set (`iframe.removeAttribute('width'); iframe.removeAttribute('height')`).

3. **Vimeo — disable responsive mode and set transparent:false.** Switch the constructor options to:
   ```ts
   new Vimeo(externalContainerRef.current, {
     id: Number(videoId),
     controls: false,
     responsive: false,   // we own the aspect ratio via parent
     playsinline: true,
     autopause: false,
     transparent: false,  // solid black bg, fixes zoom/crop artefact
     dnt: true,
     title: false, byline: false, portrait: false,
   } as any);
   ```
   Then after `ready()`, grab the injected iframe (`externalContainerRef.current.querySelector('iframe')`) and add `allowfullscreen` + clear any inline width/height attributes the SDK set, so our CSS rule wins.

4. **Allow native fullscreen on the iframe** for both platforms by setting on the iframe element after creation:
   - `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"`
   - `allowFullscreen = true`

5. **Audit ancestor containers for fullscreen blockers** in `client/src/pages/video-player.tsx`:
   - The current player is wrapped in `<div className="bg-black relative">` inside `<main className="flex-1 flex flex-col overflow-y-auto">`. `overflow-y-auto` on `<main>` does not block native fullscreen on a descendant (fullscreen targets `wrapperRef` directly), but the wrapper's own `overflow-hidden` on `aspect-video` is fine because that is the element that goes fullscreen.
   - No `transform`/`filter` classes are present on ancestors. No change required, but confirm during implementation.

## Out of scope
- Replacing the unified custom-controls player with raw iframes (would regress the previously approved Udemy-style controls, autosave, resume, prev/next).
- Changes to native `<video>` rendering — already correct (`object-contain`, `w-full h-full`).
- DB or routing changes.

## Verification checklist
- YouTube lesson: iframe fills container at all viewport widths; 16:9; fullscreen works; no related videos at end.
- Vimeo lesson: full frame visible (no crop/zoom); 16:9; black background; fullscreen works; no Vimeo badge/title/byline.
- Sidebar open/collapsed, tablet, mobile (<768px): no horizontal scroll, video maintains 16:9.
- Resume playback, autosave, prev/next, custom controls (play/pause, scrub, speed, volume, fullscreen) continue to work for both providers.
