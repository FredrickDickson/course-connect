# Quiz Submission & UX Hardening Plan

## Goals
1. Move quiz submission to a Supabase Edge Function (current `/api/quizzes/:id/submit` 404s on Vercel preview → "Failed to submit").
2. Disable submit after first click + show loading.
3. Persist in-progress quiz state across refresh.
4. Comment out the Notes tab in the lesson player.
5. Retry flow that preserves answers + clear error messages.
6. Front-end validation for unanswered required questions with inline prompts.

---

## 1. New Edge Function: `supabase/functions/quiz-submit/index.ts`

Auth-protected (validate JWT in code, `verify_jwt = false` per Lovable convention). Uses `SUPABASE_SERVICE_ROLE_KEY` internally.

Input:
```ts
{ quizId: string,
  responses: Array<{ questionId: string; answerId?: string; responseText?: string }>,
  timeSpentSeconds: number }
```

Logic:
- Validate body with zod.
- Resolve user from JWT (`supabase.auth.getUser(jwt)`).
- Load quiz + questions + answers via service role.
- Check `attempts < max_attempts` for this user/quiz; reject if exceeded.
- For each question:
  - `multiple_choice`/`true_false`: lookup `answerId` → `is_correct` → award `points` if correct.
  - `fill_blank`: case-insensitive trim compare against any `is_correct=true` answer text.
  - `essay`: 0 points (manual grade later), `is_correct = null`.
- Insert `quiz_attempts` row, then `quiz_responses` rows referencing it.
- Compute `score = round(earned/total * 100)`, `passed = score >= passing_score`.
- Update attempt with `score`, `passed`, `time_spent_minutes = ceil(timeSpentSeconds/60)`, `completed_at = now()`.
- Return `{ attemptId, score, passed, totalPoints, earnedPoints }`.
- CORS headers on every response (incl. errors); zod 400 on invalid input.

Register in `supabase/config.toml`:
```toml
[functions.quiz-submit]
verify_jwt = false
```

(Course-completion / certificate progression deferred — existing triggers on `enrollments.status='COMPLETED'` already cover it; this function only writes attempts.)

## 2. `client/src/pages/quiz.tsx` rewrites

### Submission
- Replace `fetch('/api/quizzes/...')` with `supabase.functions.invoke('quiz-submit', { body: {...} })`.
- On `error` from invoke OR error in `data`, throw with server message.

### Submit guard
- Button: `disabled={submitQuizMutation.isPending || quizSubmitted}`.
- Label: spinner + "Submitting..." while pending.
- `handleSubmitQuiz` early-returns if `isPending` or `quizSubmitted`.

### Refresh persistence
- `localStorage` key: `quiz-state:<quizId>:<userId>`.
- Persist `{ answers, currentQuestion, startedAt, timeLimitSeconds }` whenever they change (useEffect).
- On mount, if entry exists and not expired (startedAt + timeLimit > now), restore: `quizStarted=true`, recompute `timeRemaining = timeLimitSeconds - (now - startedAt)`.
- Clear on successful submit, on max-attempts exceeded, or when user clicks "Retake Quiz".

### Front-end validation
- Before calling mutation, compute `unanswered = questions.filter(q => !hasAnswer(q))`.
  - `hasAnswer`: for choice/true_false → `answers[id]` truthy; for fill_blank/essay → `(answers[id] ?? '').trim().length > 0`.
- If any unanswered:
  - Toast: "Please answer all questions before submitting."
  - Jump to first unanswered (`setCurrentQuestion(idx)`).
  - Render inline alert under that question: "This question requires an answer." (red text + border highlight on the card).
- Track `attemptedSubmit` boolean; only show inline prompts after first submit attempt.
- Show small "Answered N of M" counter beside the timer.

### Retry flow
- On mutation error: keep `answers` intact (already kept), set `lastError` state.
- Render an alert above the submit button: "Submission failed: {message}" with a "Retry submission" button that re-invokes the mutation with the same `answers`.
- Auto-retry once on network/5xx after 1s; subsequent retries are manual.
- Toast uses sonner-style destructive variant via existing `useToast`.

## 3. `client/src/components/learn/content-tabs.tsx`

- Remove `"notes"` from the tabs array on line 298 (leave a `// "notes",` comment).
- Wrap the entire `<TabsContent value="notes">` block (lines 332–358) in `{false && (...)}` or comment it out with `{/* ... */}`.
- Leave `notes` query, `addNote`, `deleteNote`, `noteDraft`, `withTimestamp` state in place but unreferenced (TS will complain about unused — prefix with `_` or wrap with `// eslint-disable-next-line`). Simpler: comment out those declarations too with a `// TODO: re-enable notes tab` marker.

## 4. No DB schema changes
All required columns (`quiz_attempts.score|passed|time_spent_minutes|completed_at|user_id|quiz_id`, `quiz_responses.attempt_id|question_id|answer_id|response_text|is_correct|points_earned`) already exist.

## 5. Files touched
- `supabase/functions/quiz-submit/index.ts` (new)
- `supabase/config.toml` (register function)
- `client/src/pages/quiz.tsx` (submit, persistence, validation, retry, guard)
- `client/src/components/learn/content-tabs.tsx` (comment out notes tab)

## 6. Manual QA checklist
- [ ] Submit once → button disables, shows spinner, succeeds → results screen.
- [ ] Refresh mid-quiz → answers + question index + timer restored.
- [ ] Try submit with 1 unanswered → toast + jump to question + inline prompt.
- [ ] Force network failure → "Retry submission" button preserves answers.
- [ ] Notes tab no longer visible in lesson player.
- [ ] Max attempts still enforced server-side.
