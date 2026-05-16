## Problem

On mobile, the course content sheet shows two close (X) buttons:
1. The built-in close button from `SheetContent` (Radix Dialog Close), already styled white/large in `video-player.tsx`.
2. A second X rendered by `CourseSidebar` because `onClose` is passed in.

## Fix

In `client/src/pages/video-player.tsx` (line 384–389), remove the `onClose={() => setMobileSheetOpen(false)}` prop from `<CourseSidebar>` inside the mobile `<SheetContent>`. The Sheet's built-in close button (already styled for visibility) handles closing, and `onLessonClick` still closes the sheet when a lesson is tapped.

No changes to `CourseSidebar` itself — the desktop usage that still passes `onClose` keeps its single X.

## Files

- `client/src/pages/video-player.tsx` — drop the `onClose` prop on the mobile `CourseSidebar` instance only.
