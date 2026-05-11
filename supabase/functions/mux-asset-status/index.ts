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

    let assetId: string | null = null;
    let muxAssetId: string | null = null;
    let muxUploadId: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      assetId = body?.assetId ?? null;
      muxAssetId = body?.muxAssetId ?? null;
      muxUploadId = body?.uploadId ?? null;
    } else {
      const url = new URL(req.url);
      assetId = url.searchParams.get("assetId");
      muxAssetId = url.searchParams.get("muxAssetId");
      muxUploadId = url.searchParams.get("uploadId");
    }

    if (!assetId && !muxAssetId && !muxUploadId) {
      return new Response(
        JSON.stringify({ error: "assetId, muxAssetId or uploadId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let muxAsset: any = null;
    if (muxAssetId) {
      const { data } = await admin.from("mux_assets").select("*").eq("id", muxAssetId).maybeSingle();
      muxAsset = data;
      assetId = muxAsset?.mux_asset_id || assetId;
      muxUploadId = muxAsset?.mux_upload_id || muxUploadId;
    } else if (assetId) {
      const { data } = await admin.from("mux_assets").select("*").eq("mux_asset_id", assetId).maybeSingle();
      muxAsset = data;
      muxUploadId = muxAsset?.mux_upload_id || muxUploadId;
    } else if (muxUploadId) {
      const { data } = await admin.from("mux_assets").select("*").eq("mux_upload_id", muxUploadId).maybeSingle();
      muxAsset = data;
      assetId = muxAsset?.mux_asset_id || assetId;
    }

    // Resolve assetId from Mux upload if we still don't have one
    if (!assetId && muxUploadId) {
      try {
        const upRes = await fetch(`https://api.mux.com/video/v1/uploads/${muxUploadId}`, {
          headers: { Authorization: muxAuthHeader() },
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          const resolved = upJson?.data?.asset_id ?? null;
          if (resolved) {
            assetId = resolved;
            if (muxAsset?.id) {
              await admin
                .from("mux_assets")
                .update({
                  mux_asset_id: resolved,
                  upload_status: muxAsset.upload_status === "pending" ? "preparing" : muxAsset.upload_status,
                })
                .eq("id", muxAsset.id);
              muxAsset = { ...muxAsset, mux_asset_id: resolved };
            }
          }
        }
      } catch (e) {
        console.error("Mux upload lookup failed:", e);
      }
    }

    let asset: any = null;
    if (assetId) {
      const muxRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: muxAuthHeader() },
      });
      if (muxRes.ok) {
        const json = await muxRes.json();
        asset = json.data;

        // Webhook fallback: sync DB if Mux already advanced
        if (asset?.status === "ready" && muxAsset?.id) {
          const playbackId = asset.playback_ids?.[0]?.id ?? muxAsset.mux_playback_id ?? "";
          if (muxAsset.upload_status !== "ready" || !muxAsset.mux_playback_id) {
            await admin
              .from("mux_assets")
              .update({
                upload_status: "ready",
                asset_status: "ready",
                mux_playback_id: playbackId,
                mux_asset_id: assetId,
                duration_seconds: Math.round(asset.duration ?? 0),
              })
              .eq("id", muxAsset.id);
            muxAsset = {
              ...muxAsset,
              upload_status: "ready",
              asset_status: "ready",
              mux_playback_id: playbackId,
              mux_asset_id: assetId,
            };
            if (muxAsset.lesson_id && playbackId) {
              await admin
                .from("lessons")
                .update({ mux_playback_id: playbackId, mux_asset_id: assetId, mux_status: "ready" })
                .eq("id", muxAsset.lesson_id);
            }
          }
        } else if (asset?.status === "errored" && muxAsset?.id && muxAsset.upload_status !== "errored") {
          await admin
            .from("mux_assets")
            .update({
              upload_status: "errored",
              asset_status: "errored",
              error_message: JSON.stringify(asset.errors ?? null),
            })
            .eq("id", muxAsset.id);
          if (muxAsset.lesson_id) {
            await admin.from("lessons").update({ mux_status: "errored" }).eq("id", muxAsset.lesson_id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ asset, muxAsset }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mux-asset-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});