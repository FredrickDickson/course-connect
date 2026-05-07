## Problem

Inserts into `public.lessons` keep returning 403 (`42501 — new row violates row-level security policy`) for instructor `6e3dc8a4-…` even though:

- Policy `lessons_insert WITH CHECK user_owns_module(module_id, auth.uid())` is correct.
- `user_owns_module(<each module>, '6e3dc…')` returns `true` for all three modules of the course.
- `courses.instructor_id` exactly equals the user id.
- `user_owns_module` is `SECURITY DEFINER`, owned by `postgres`, `EXECUTE` granted to PUBLIC.
- The user's role in `public.users` is `instructor`.

So either (a) `auth.uid()` inside the request is NOT what we think (the request is reaching PostgREST as `anon` or with a different `sub`), or (b) the client is sending `module_id: null` for some code path.

The earlier "Multiple GoTrueClient instances" warning + the existence of a second copy of the Supabase client at `src/integrations/supabase/client.ts` (parallel to the canonical `client/src/integrations/supabase/client.ts`) is the most likely culprit — both register listeners on the same storage key, can race, and one of them can momentarily emit requests with no/anon session.

## Plan

### 1. Remove the duplicate Supabase client (root cause candidate)

- Delete `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` (the canonical files live under `client/src/integrations/supabase/`).
- Verify nothing in the bundle imports from root `src/...` (already confirmed via grep — no consumers).

This eliminates the "Multiple GoTrueClient instances" race that can cause intermittent unauthenticated requests.

### 2. Add a diagnostic RPC + client-side probe

Create a `SECURITY INVOKER` SQL function that returns the JWT the database actually sees:

```sql
create or replace function public.debug_whoami()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;
grant execute on function public.debug_whoami() to anon, authenticated;
```

In `LectureContentEditor.handleSave` and `ensureLessonExists`, before the `lessons` insert, call `supabase.rpc('debug_whoami')` and `console.log` it. This proves whether the failing request is going out as the instructor or as anon.

### 3. Harden the insert path

- In `LectureContentEditor`, refuse to call insert when `moduleId` is falsy, surfacing a clear toast instead of a 403.
- Refresh the auth session (`supabase.auth.getSession()`) once at the top of `handleSave`/`ensureLessonExists`; if the session is missing, redirect to `/login` with a toast rather than firing the insert.

### 4. Verify and clean up

- Reproduce: open the curriculum page, add a lecture, observe the `debug_whoami` log.
  - If `uid` matches the instructor → root cause is data/payload (we'll see `module_id` in the 400/403 response and adjust).
  - If `uid` is null/different → confirmed stale-session bug; the duplicate-client removal in step 1 already addresses it, and step 3 prevents recurrence.
- Once green, remove the `console.log` calls but keep `debug_whoami` (cheap, useful for future debugging).

## Technical notes

- No RLS policy changes needed — current policies are correct.
- No schema changes other than the new diagnostic function.
- `client/src/integrations/supabase/client.ts` already passes `storage: localStorage` and PKCE; it remains the single source of truth for the browser session.
