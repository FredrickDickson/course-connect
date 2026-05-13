// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function muxAuthHeader() {
  return "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { lessonId } = body ?? {};
    if (typeof lessonId !== "string") {
      return new Response(JSON.stringify({ error: "lessonId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify ownership
    const { data: lesson, error: lessonErr } = await admin
      .from("lessons")
      .select("id, modules!inner(course_id, courses!inner(instructor_id))")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const instructorId = (lesson as any).modules?.courses?.instructor_id;
    if (instructorId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find associated mux assets
    const { data: muxAssets } = await admin
      .from("mux_assets")
      .select("id, mux_asset_id, mux_upload_id")
      .eq("lesson_id", lessonId);

    if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
      for (const a of muxAssets ?? []) {
        if (a.mux_asset_id) {
          await fetch(`https://api.mux.com/video/v1/assets/${a.mux_asset_id}`, {
            method: "DELETE",
            headers: { Authorization: muxAuthHeader() },
          }).catch((e) => console.error("Mux asset delete failed", e));
        } else if (a.mux_upload_id) {
          await fetch(`https://api.mux.com/video/v1/uploads/${a.mux_upload_id}/cancel`, {
            method: "PUT",
            headers: { Authorization: muxAuthHeader() },
          }).catch((e) => console.error("Mux upload cancel failed", e));
        }
      }
    }

    // Delete tracking rows
    await admin.from("mux_assets").delete().eq("lesson_id", lessonId);

    // Clear lesson video fields
    await admin
      .from("lessons")
      .update({
        video_url: null,
        video_platform: null,
        video_id: null,
        mux_asset_id: null,
        mux_playback_id: null,
        mux_status: null,
      })
      .eq("id", lessonId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mux-delete-asset error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});