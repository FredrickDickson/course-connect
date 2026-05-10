import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mux-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_SECRET = Deno.env.get("MUX_WEBHOOK_SIGNING_SECRET");

async function verifyMuxSignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!SIGNING_SECRET) {
    console.warn("MUX_WEBHOOK_SIGNING_SECRET not configured — skipping verification");
    return true;
  }
  if (!header) return false;

  // Header format: "t=<timestamp>,v1=<signature>"
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const timestamp = parts["t"];
  const expected = parts["v1"];
  if (!timestamp || !expected) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const valid = await verifyMuxSignature(rawBody, req.headers.get("mux-signature"));
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event ?? {};
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!type || !data) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const id: string = data.id;
    const passthrough: string | undefined = data.passthrough;
    const playbackId: string = data.playback_ids?.[0]?.id ?? "";

    if (type === "video.upload.asset_created") {
      // Asset created from upload — link it to the pending row via lesson_id
      if (passthrough) {
        await admin
          .from("mux_assets")
          .update({ mux_asset_id: id, upload_status: "preparing", asset_status: "preparing" })
          .eq("lesson_id", passthrough)
          .eq("upload_status", "pending");
      }
    } else if (type === "video.asset.created") {
      await admin
        .from("mux_assets")
        .update({ upload_status: "preparing", asset_status: "preparing" })
        .eq("mux_asset_id", id);
      // Fallback: update by lesson_id if mux_asset_id was initially null
      if (passthrough) {
        await admin
          .from("mux_assets")
          .update({ mux_asset_id: id, upload_status: "preparing", asset_status: "preparing" })
          .eq("lesson_id", passthrough)
          .eq("upload_status", "pending");
      }
    } else if (type === "video.asset.ready") {
      await admin
        .from("mux_assets")
        .update({
          upload_status: "ready",
          asset_status: "ready",
          mux_playback_id: playbackId,
          duration_seconds: Math.round(data.duration ?? 0),
        })
        .eq("mux_asset_id", id);
      // Fallback: update by lesson_id if mux_asset_id was not yet set
      if (passthrough) {
        await admin
          .from("mux_assets")
          .update({
            upload_status: "ready",
            asset_status: "ready",
            mux_playback_id: playbackId,
            duration_seconds: Math.round(data.duration ?? 0),
            mux_asset_id: id,
          })
          .eq("lesson_id", passthrough)
          .eq("upload_status", "preparing");
      }

      const lessonUpdate = {
        mux_playback_id: playbackId,
        mux_status: "ready",
      };
      if (passthrough) {
        await admin.from("lessons").update(lessonUpdate).eq("id", passthrough);
      } else {
        await admin.from("lessons").update(lessonUpdate).eq("mux_asset_id", id);
      }
    } else if (type === "video.asset.errored") {
      await admin
        .from("mux_assets")
        .update({ upload_status: "errored", asset_status: "errored" })
        .eq("mux_asset_id", id);
      // Fallback: update by lesson_id
      if (passthrough) {
        await admin
          .from("mux_assets")
          .update({ upload_status: "errored", asset_status: "errored", mux_asset_id: id })
          .eq("lesson_id", passthrough)
          .eq("upload_status", "pending");
      }

      if (passthrough) {
        await admin.from("lessons").update({ mux_status: "errored" }).eq("id", passthrough);
      } else {
        await admin.from("lessons").update({ mux_status: "errored" }).eq("mux_asset_id", id);
      }
      console.error("Mux asset errored:", data.errors);
    } else {
      console.log("Unhandled Mux webhook type:", type);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mux-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});