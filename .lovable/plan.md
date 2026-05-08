## Root cause

Lesson check-offs, quiz "complete", and assignment "complete" all funnel through the same call in `client/src/pages/video-player.tsx`:

```ts
supabase.from("progress").upsert(
  { user_id, lesson_id, completed, watch_time_seconds, last_watched_at },
  { onConflict: "user_id,lesson_id" }
)
```

But the `public.progress` table has only a primary key on `id` — there is no unique constraint on `(user_id, lesson_id)`. PostgREST therefore rejects every upsert with error `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`, so nothing is ever written. The UI ticks optimistically, then reverts on the next refetch (table is empty — confirmed: `SELECT COUNT(*) FROM progress` returns 0).

This is why videos never mark complete, and why quiz/assignment completions don't stick either — `QuizStage` and `AssignmentStage` both call the same `handleToggleComplete` on success.

## Fix

One small migration, no code changes:

1. Deduplicate any rows (table is currently empty so this is a no-op safety net).
2. Add `UNIQUE (user_id, lesson_id)` on `public.progress` — this matches the `onConflict` key already used by the client and by `server/storage/enrollments.ts::updateProgress`.
3. Add a supporting btree index on `(user_id, lesson_id)` for the lookup query in the player (already covered by the unique constraint, so this is automatic).

After the migration:
- Checking the sidebar checkbox writes a row → progress query refetches → checkbox stays ticked.
- Video auto-complete at 90% / 30s external timer / `onEnded` all persist.
- Quiz `onComplete` and Assignment `onComplete` mark the parent lesson complete.
- Once all lessons in a course are complete, the existing `MyCertificates` component on `/certification` unlocks the Preview button.

## Out of scope

- No changes to quiz scoring, assignment grading, or the certificate-issuance trigger.
- No UI changes.
- No RLS policy changes — existing policies on `progress` already allow users to insert/update their own rows.
