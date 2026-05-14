## Goal

1. Mux videos resume from saved playback time per lecture (already partially wired but currently broken).
2. Mux video durations show in the course sidebar and course content list.
3. Instructor can rename a lesson without losing/re‑uploading the Mux video.

## Findings

- `client/src/pages/video-player.tsx` already reads `resumeSeconds` from `progress.watch_time_seconds`, but never passes it to the player (`startAt` prop is missing on the `LazyVideoPlayer` call). Result: no resume for any source.
- `client/src/components/ui/video-player.tsx` (Mux branch) does support `startTime={startAt}`, but its `onTimeUpdate` callback fires with no arguments, while the page handler expects `(cur, dur)`. Result: progress is never persisted, so even after fixing `startAt` there's nothing to resume to.
- `lessons.duration_seconds` is never set for Mux uploads. `mux-asset-status` and `mux-webhook` write `duration_seconds` only into the `mux_assets` row, while the sidebar reads `lessons.duration_seconds`. Result: Mux lessons render with no duration in the sidebar / course content list.
- `course-curriculum.tsx`'s `Lesson` interface and the data it passes to `LectureContentEditor` omit `muxAssetId`, `muxPlaybackId`, `muxStatus`. When the editor opens for an existing Mux lesson, those fields default to empty, and saving wipes `mux_asset_id` / `mux_playback_id` / `mux_status` to `null` — appearing as if the video was lost. This is why simply changing the title currently requires re‑uploading.

## Changes

### 1. Resume playback for Mux (and all sources)

`client/src/components/ui/video-player.tsx`
- In the Mux `<MuxPlayer>` `onTimeUpdate`, call `onTimeUpdate?.(t, duration)` with currentTime + duration.
- Do the same in the YouTube, Vimeo, and HTML5 native `onTimeUpdate` handlers so progress persistence works for every source.
- Throttle: only invoke parent `onTimeUpdate` roughly every 5s (compare to a ref) to avoid flooding Supabase.

`client/src/pages/video-player.tsx`
- Pass `startAt={resumeSeconds}` to `<VP>`.
- Keep the existing autosave + resume‑toast logic.

### 2. Show Mux duration in sidebar / course content

`supabase/functions/mux-webhook/index.ts` and `supabase/functions/mux-asset-status/index.ts`
- When the asset becomes `ready` and we update the `lessons` row (set `mux_playback_id`, `mux_asset_id`, `mux_status`), also set `duration_seconds = Math.round(asset.duration)` so the sidebar and course content list pick it up.

Backfill (one‑time): a small migration update copies `mux_assets.duration_seconds` into `lessons.duration_seconds` for existing rows where the lesson currently has no duration but a Mux playback id exists.

### 3. Edit lesson title without losing the Mux video

`client/src/pages/course-curriculum.tsx`
- Extend the `Lesson` interface with `muxAssetId?`, `muxPlaybackId?`, `muxStatus?`, `videoPlatform?`, `videoId?`.
- Where the lessons list is built from the query result, map the snake_case DB fields (`mux_asset_id`, `mux_playback_id`, `mux_status`, `video_platform`, `video_id`) to those camelCase fields so they reach `LectureContentEditor`.

`client/src/components/LectureContentEditor.tsx`
- The existing `useEffect` already hydrates `muxAssetId / muxPlaybackId / muxStatus` from `lesson?.*`, so once the parent passes them, edits (including title‑only) preserve the Mux asset.
- Defensive guard: in `handleSave`, when `videoSource === 'mux'`, fall back to the previously loaded `lesson?.muxAssetId / muxPlaybackId / muxStatus` if local state is empty, so we never write `null` over an existing asset by accident.

## Out of scope

- No DB schema changes (only data backfill and edge‑function field updates).
- No changes to the upload flow itself or to the non‑Mux video player chrome (already finalized in the previous turn).