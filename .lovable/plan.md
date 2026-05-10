## Goal

Make Mux video uploads work for instructors on the deployed site (`cimalearn.thecima.org`). The frontend currently calls `/api/mux/upload-url`, which is an Express route that does not exist on Vercel — hence the 404. We will port the Mux endpoints to Supabase Edge Functions (consistent with the rest of the platform) and update the uploader to call them.

## Steps

### 1. Get Mux credentials from you
You'll create a Mux access token at **dashboard.mux.com → Settings → Access Tokens** with **Video read + write** scope. After the plan is approved, I'll request these as Supabase secrets:
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SIGNING_SECRET` (added after step 3 once Mux gives you the value)

### 2. Create three Supabase edge functions

**`supabase/functions/mux-upload-url/index.ts`** (auth-required)
- Validates JWT, parses `{ lessonId, fileName, fileSize }` with Zod.
- Confirms caller owns the course (`courses.instructor_id`) the lesson belongs to.
- Calls Mux `POST /video/v1/uploads` with smart encoding, 1080p max, signed playback policy, `passthrough = lessonId`, `cors_origin = origin header`.
- Inserts row into `mux_assets` (status `pending`).
- Returns `{ uploadId, uploadUrl, assetId, muxAssetId }`.

**`supabase/functions/mux-asset-status/index.ts`** (auth-required)
- Accepts `?assetId=…`, fetches Mux asset + `mux_assets` row, returns combined payload (so the polling fallback in `MuxUploader` keeps working).

**`supabase/functions/mux-webhook/index.ts`** (public, `verify_jwt = false` in `supabase/config.toml`)
- Reads raw body, verifies the `mux-signature` header against `MUX_WEBHOOK_SIGNING_SECRET`.
- Handles `video.asset.created`, `video.asset.ready`, `video.asset.errored` — updates `mux_assets` and `lessons` (using `passthrough` for the lesson id) exactly like the Express handlers do today.

All functions call Mux with `fetch` + Basic auth (`btoa(`${id}:${secret}`)`) — no `@mux/mux-node` SDK needed in Deno.

### 3. Wire up the Mux webhook
After deploy, the webhook URL will be:
`https://emvibxbcrvritkwkguya.supabase.co/functions/v1/mux-webhook`

You'll paste it into **Mux dashboard → Settings → Webhooks**, then copy the signing secret it gives you. I'll add it as `MUX_WEBHOOK_SIGNING_SECRET`.

### 4. Update `client/src/components/MuxUploader.tsx`
Replace the two `fetch('/api/mux/...')` calls with `supabase.functions.invoke('mux-upload-url', { body: {...} })` and `supabase.functions.invoke('mux-asset-status', { body: { assetId } })`. No other behavioural change.

### 5. Verify
- Reproduce upload from `/instructor/courses/.../curriculum`, confirm 200 from `mux-upload-url`, the PUT to Mux succeeds, and the lesson row gets a `mux_playback_id` once the webhook fires.
- Check `mux-upload-url` and `mux-webhook` edge function logs.

## Out of scope
- The legacy `server/routes/mux.ts` Express route stays in the repo (other dev environments still use it). Production traffic just stops hitting it.
- No changes to the `mux_assets` table schema or RLS — service role is used inside the edge functions.
