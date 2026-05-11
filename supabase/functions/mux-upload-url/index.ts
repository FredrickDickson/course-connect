// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    console.log("mux-upload-url called");
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      console.error("Mux credentials missing: TOKEN_ID", !!MUX_TOKEN_ID, "TOKEN_SECRET", !!MUX_TOKEN_SECRET);
      return new Response(
        JSON.stringify({ error: "Mux credentials are not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify caller
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
    const { lessonId, fileName, fileSize } = body ?? {};

    if (
      typeof lessonId !== "string" ||
      typeof fileName !== "string" ||
      typeof fileSize !== "number" ||
      fileSize <= 0 ||
      fileSize > 5 * 1024 * 1024 * 1024
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid input: lessonId, fileName, fileSize required (fileSize <= 5GB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for ownership lookup + insert
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Confirm caller owns the course
    const { data: lesson, error: lessonErr } = await admin
      .from("lessons")
      .select("id, modules!inner(course_id, courses!inner(instructor_id))")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson) {
      console.error("Lesson lookup failed:", lessonErr, "lessonId:", lessonId);
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // deno-lint-ignore no-explicit-any
    const instructorId = (lesson as any).modules?.courses?.instructor_id;
    if (instructorId !== userId) {
      return new Response(JSON.stringify({ error: "Only the course instructor can upload videos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "*";

    // Create Mux direct upload
    const muxRes = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: muxAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cors_origin: origin,
        timeout: 3600,
        new_asset_settings: {
          playback_policy: ["signed"],
          mp4_support: "standard",
          passthrough: lessonId,
          encoding_tier: "smart",
          max_resolution_tier: "1080p",
        },
      }),
    });

    if (!muxRes.ok) {
      const text = await muxRes.text();
      console.error("Mux upload create failed:", muxRes.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to create Mux upload", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: upload } = await muxRes.json();

    // Insert tracking row
    const { data: muxAsset, error: insertErr } = await admin
      .from("mux_assets")
      .insert({
        lesson_id: lessonId,
        mux_asset_id: upload.asset_id ?? "",
        mux_playback_id: "",
        upload_status: "pending",
        upload_url: upload.url ?? "",
        mux_upload_id: upload.id ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("mux_assets insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to record upload" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id ?? null,
        muxAssetId: muxAsset.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("mux-upload-url error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});