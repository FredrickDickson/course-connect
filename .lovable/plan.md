## Plan

I found two likely root causes:
- **Mux:** recent `mux_assets` rows are stuck in `pending` with no `mux_asset_id`, which means the handoff from direct upload to asset creation is not being persisted. The current polling path only checks asset status, so it can wait forever if the asset ID is never backfilled.
- **Instructor access:** your current user already has `users.role = instructor`, so this is likely a **frontend role-resolution/loading bug**, not a missing role in the database.

### 1) Make the Mux upload flow resilient
- Update the upload flow so it tracks the **Mux upload ID** as well as the eventual asset ID.
- Change the status function to poll **Mux upload state first**, discover the created asset ID when it becomes available, save it back to `mux_assets`/`lessons`, then continue polling the asset until playback is ready.
- Keep the webhook, but make it **idempotent** and treat it as a fast-path instead of the only path.
- Improve the client uploader so it shows accurate states (`uploading`, `processing`, `ready`, `failed`) and stops hanging at 50% when Mux has already advanced.

### 2) Fix instructor role gating
- Refactor auth state so **session readiness** and **role readiness** are handled separately.
- Resolve the role from the database deterministically and avoid redirecting/hiding instructor UI while role data is still loading.
- Update the header, protected routes, and instructor dashboard checks so a real instructor is not bounced out during transient auth/profile fetch states.

### 3) Validate both fixes end-to-end
- Verify a real upload moves through: `pending -> preparing/processing -> ready` and writes `mux_playback_id` back to the lesson.
- Verify an instructor account sees the **Instructor** nav item and can open `/instructor` without being redirected.
- Check edge-function logs after the changes to confirm the webhook and polling fallback are both working.

## Technical details

### Expected code changes
- `supabase/functions/mux-upload-url/index.ts`
- `supabase/functions/mux-asset-status/index.ts`
- `supabase/functions/mux-webhook/index.ts`
- `client/src/components/MuxUploader.tsx`
- `client/src/contexts/AuthContext.tsx`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/components/header.tsx`
- possibly `client/src/pages/instructor-dashboard.tsx`

### Database change likely needed first
To make Mux polling reliable, I’ll likely add fields like:
- `mux_upload_id`
- optional `error_message` / last failure detail

That lets the app recover even when the webhook is delayed or missed.

### Success criteria
- Upload no longer sits forever at 50%.
- `mux_assets` records no longer accumulate in permanent `pending` state.
- Lessons receive `mux_playback_id` automatically once ready.
- Instructors can consistently see and open the instructor area.