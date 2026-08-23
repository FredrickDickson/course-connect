import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zm-signature, x-zm-request-timestamp",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET_TOKEN = Deno.env.get("ZOOM_SECRET_TOKEN");

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyZoomSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): Promise<boolean> {
  if (!SECRET_TOKEN) {
    console.error("ZOOM_SECRET_TOKEN not configured — rejecting webhook");
    return false;
  }
  if (!signatureHeader || !timestampHeader) return false;

  const expectedHex = await hmacHex(`v0:${timestampHeader}:${rawBody}`, SECRET_TOKEN);
  return signatureHeader === `v0=${expectedHex}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody || "{}");

    // Zoom's one-time endpoint validation handshake: no signature is sent for
    // this call (it's how you prove ownership of the URL in the first place),
    // so it must be handled before the signature check below.
    if (event?.event === "endpoint.url_validation") {
      const plainToken = event?.payload?.plainToken;
      if (!plainToken || !SECRET_TOKEN) {
        return json({ error: "Cannot validate endpoint" }, 400);
      }
      const encryptedToken = await hmacHex(plainToken, SECRET_TOKEN);
      return json({ plainToken, encryptedToken });
    }

    const valid = await verifyZoomSignature(
      rawBody,
      req.headers.get("x-zm-signature"),
      req.headers.get("x-zm-request-timestamp"),
    );
    if (!valid) {
      return json({ error: "Invalid signature" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const type: string | undefined = event?.event;
    const obj = event?.payload?.object;
    const meetingId: string | undefined = obj?.id != null ? String(obj.id) : undefined;

    if (!type || !obj || !meetingId) {
      return json({ ok: true });
    }

    if (type === "meeting.started") {
      await admin
        .from("live_sessions")
        .update({ status: "live", started_at: new Date().toISOString() })
        .eq("zoom_meeting_id", meetingId)
        .in("status", ["scheduled", "live"]);
    } else if (type === "meeting.ended") {
      const { data: session } = await admin
        .from("live_sessions")
        .select("id, started_at")
        .eq("zoom_meeting_id", meetingId)
        .maybeSingle();

      const endedAt = new Date();
      const startedAt = session?.started_at ? new Date(session.started_at) : null;
      const actualDurationMinutes = startedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
        : null;

      await admin
        .from("live_sessions")
        .update({
          status: "completed",
          ended_at: endedAt.toISOString(),
          ...(actualDurationMinutes !== null ? { actual_duration_minutes: actualDurationMinutes } : {}),
        })
        .eq("zoom_meeting_id", meetingId);
    } else if (type === "recording.completed") {
      const files: Array<{ play_url?: string; download_url?: string }> = obj.recording_files || [];
      const recordingUrl = obj.share_url || files.find((f) => f.play_url)?.play_url || files[0]?.download_url;

      if (recordingUrl) {
        await admin
          .from("live_sessions")
          .update({
            recording_url: recordingUrl,
            recording_password: obj.password ?? null,
            is_recording_available: true,
          })
          .eq("zoom_meeting_id", meetingId);
      }
    } else if (type === "meeting.participant_joined" || type === "meeting.participant_left") {
      const participant = obj.participant;
      const email: string | undefined = participant?.email;
      const zoomParticipantId: string | undefined = participant?.id ?? participant?.participant_uuid;

      const { data: session } = await admin
        .from("live_sessions")
        .select("id")
        .eq("zoom_meeting_id", meetingId)
        .maybeSingle();

      if (!session) {
        console.log(`zoom-webhook: no live_sessions row for meeting ${meetingId}, skipping participant event`);
        return json({ ok: true });
      }

      let userId: string | undefined;
      if (email) {
        const { data: user } = await admin
          .from("users")
          .select("id")
          .ilike("email", email)
          .maybeSingle();
        userId = user?.id;
      }

      if (!userId) {
        console.log(`zoom-webhook: no matching user for participant email on meeting ${meetingId}, skipping`);
        return json({ ok: true });
      }

      if (type === "meeting.participant_joined") {
        await admin
          .from("session_participants")
          .upsert(
            {
              session_id: session.id,
              user_id: userId,
              registration_status: "attended",
              joined_at: new Date().toISOString(),
              zoom_participant_id: zoomParticipantId ?? null,
            },
            { onConflict: "session_id,user_id" },
          );
      } else {
        const { data: participantRow } = await admin
          .from("session_participants")
          .select("id, joined_at")
          .eq("session_id", session.id)
          .eq("user_id", userId)
          .maybeSingle();

        const leftAt = new Date();
        const joinedAt = participantRow?.joined_at ? new Date(participantRow.joined_at) : null;
        const attendanceDurationMinutes = joinedAt
          ? Math.max(0, Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000))
          : null;

        if (participantRow) {
          await admin
            .from("session_participants")
            .update({
              left_at: leftAt.toISOString(),
              ...(attendanceDurationMinutes !== null
                ? { attendance_duration_minutes: attendanceDurationMinutes }
                : {}),
            })
            .eq("id", participantRow.id);
        }
      }
    } else {
      console.log("Unhandled Zoom webhook event:", type);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("zoom-webhook error:", err);
    return json({ error: String(err) }, 500);
  }
});
