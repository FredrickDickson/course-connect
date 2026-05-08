
## Goals

1. Resume playback at last watched timestamp.
2. Auto-persist watch progress + completion immediately.
3. Comment out Q&A, "Report an issue", and "Contact instructor" UI.
4. Let instructors manage lesson resources (add/preview/download with file-type icons).
5. Let instructors add/edit/delete course announcements.
6. Use the custom Udemy-style player UI for YouTube/Vimeo too (proxy via player APIs).

---

## 1. Resume Playback

In `client/src/pages/video-player.tsx`:
- Read `progress.find(p => p.lesson_id === currentLesson.id)?.watch_time_seconds` on load.
- Pass new prop `startAt={resumeSeconds}` to `<VideoPlayer>`.
- If `resumeSeconds > 5` and `< duration - 10`, show small toast "Resumed from MM:SS · Restart" with a Restart action that seeks to 0.

In `client/src/components/ui/video-player.tsx`:
- Accept `startAt?: number` prop. On `onLoadedMetadata`, if `startAt > 0` and not yet seeked, set `videoRef.current.currentTime = startAt` (guard with a `didSeekRef`).
- For YouTube/Vimeo (after item 6 below), seek via their JS APIs once player is ready.

## 2. Auto-Persist Progress + Completion

In `video-player.tsx`:
- Reduce save threshold from every 10s to every 5s.
- Add `onPause` handler → flush a save immediately.
- Add `beforeunload` and route-change cleanup → final save of `currentTime`.
- Mark `completed = true` when `cur >= dur * 0.9` (already in code) AND keep saving timestamp afterward so resume still works.
- For external (YouTube/Vimeo) videos with the new unified player, run the same 5s save loop driven by player state polling (see item 6).

In `course-sidebar.tsx` checkbox: already wired through `onToggleComplete`. Add optimistic update via `qc.setQueryData(["learn-progress", courseId, user?.id], ...)` so the UI ticks instantly without waiting for the round-trip.

## 3. Comment-out Q&A / Report / Contact

- `content-tabs.tsx`: wrap the `qa` `TabsTrigger` and `TabsContent` in `{/* ... */}` (keep code intact for later). Default tab stays `overview`.
- `course-top-bar.tsx`: comment out the `Report an issue` and `Contact instructor` `DropdownMenuItem` blocks. Keep `Download resources`.

## 4. Instructor Resource Management

Detect instructor: `isInstructor = user?.id === course.instructor_id || isAdmin` (use existing role check pattern).

Edits in `content-tabs.tsx` Resources tab:
- If `isInstructor`, show "Add resource" button → opens dialog:
  - Name (text)
  - File upload to existing private bucket `lesson-resources` at path `${course.id}/${lesson.id}/${uuid}-${filename}`
  - Auto-detect `resource_type` from file extension (pdf, doc, xls, ppt, zip, image, video, audio, link, other)
  - Optional: paste external URL (link type)
  - On submit: insert into `lesson_resources` with `name`, `file_url` (signed URL or storage path → resolved to signed URL on read), `file_size_mb`, `resource_type`, `lesson_id`.
- Each row shows: file-type icon, name, size, type. Buttons: Preview (PDFs/images/video/audio open in dialog with `<iframe>`/`<img>`/`<video>`/`<audio>`; others fallback to download), Download (signed-URL `a` tag with `download`), Delete (instructor only).
- Helper `getFileIcon(type)` mapping: `FileText` (pdf/doc), `FileSpreadsheet` (xls/csv), `Presentation` (ppt), `FileArchive` (zip), `Image` (image), `Video`, `Music`, `Link2`, `File`.
- Use `supabase.storage.from('lesson-resources').createSignedUrl(path, 3600)` for previews/downloads.

RLS already exists from prior migration; no DB changes needed.

## 5. Instructor Announcement Management

Edits in `content-tabs.tsx` Announcements tab:
- If `isInstructor`, show "New announcement" button → dialog with `title` + `body`.
- Each announcement row (instructor view) gets Edit and Delete icon buttons → edit dialog reuses form; delete confirms.
- Mutations: `insertAnnouncement`, `updateAnnouncement`, `deleteAnnouncement` against `course_announcements` table (RLS already permits instructor+admin writes).
- Keep existing student read-tracking unchanged.

## 6. Unified Udemy-Style Player for YouTube/Vimeo

Goal: same chrome (scrub bar, time, speed, volume, prev/next, theatre, fullscreen) for all sources, hiding the native YT/Vimeo UI.

Approach in `client/src/components/ui/video-player.tsx`:
- Refactor so the controls overlay is rendered for all sources.
- Add a `playerAdapter` abstraction with methods: `play/pause/seek/getCurrentTime/getDuration/setVolume/setMuted/setRate/onTimeUpdate/onPlay/onPause/onEnded/onReady`.
- Three adapters:
  - `nativeAdapter` — wraps `<video>` (current behaviour).
  - `youtubeAdapter` — loads YouTube IFrame API (`https://www.youtube.com/iframe_api`), creates `new YT.Player(...)` with `controls:0, modestbranding:1, rel:0, playsinline:1, disablekb:1, fs:0, iv_load_policy:3`, polls `getCurrentTime()` every 250ms for time updates.
  - `vimeoAdapter` — loads `@vimeo/player` package (`bun add @vimeo/player`), embed with `controls:false`, subscribe to `timeupdate/play/pause/ended` events.
- Render either `<video>`, `<div ref=ytContainer>`, or `<div ref=vimeoContainer>` underneath the same overlay.
- The overlay calls `adapter.play()`, `adapter.seek(t)`, etc.
- Fullscreen targets the wrapper div (works for iframes too).
- For `startAt`: adapter's `onReady` → `adapter.seek(startAt)`.
- Note: YT/Vimeo embed branding (logo) inside the iframe can't be fully removed, but their control bars are hidden via params/options; our overlay sits on top and intercepts pointer events on a transparent layer above the iframe (so click=play/pause works).

## Files

Edited:
- `client/src/pages/video-player.tsx` — pass `startAt`, faster autosave, onPause flush, optimistic completion.
- `client/src/components/ui/video-player.tsx` — `startAt` prop, adapter refactor for YT/Vimeo with shared overlay.
- `client/src/components/learn/content-tabs.tsx` — comment Q&A; add instructor controls for resources + announcements; resource preview dialog + file-type icons.
- `client/src/components/learn/course-top-bar.tsx` — comment Report/Contact items.

Added dependency: `@vimeo/player`.

No DB migrations needed (tables and RLS exist).

## Out of Scope

- Re-enabling Q&A (kept commented for future).
- Rich-text announcement editor (plain textarea).
- Per-resource ordering UI.
