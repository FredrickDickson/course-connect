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
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      assetId = body?.assetId ?? null;
      muxAssetId = body?.muxAssetId ?? null;
    } else {
      const url = new URL(req.url);
      assetId = url.searchParams.get("assetId");
      muxAssetId = url.searchParams.get("muxAssetId");
    }

    if (!assetId && !muxAssetId) {
      return new Response(JSON.stringify({ error: "assetId or muxAssetId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let muxAsset: unknown = null;
    if (muxAssetId) {
      const { data } = await admin
        .from("mux_assets")
        .select("*")
        .eq("id", muxAssetId)
        .maybeSingle();
      muxAsset = data;
      // Use || so empty-string mux_asset_id falls through to request's assetId
      assetId = muxAsset?.mux_asset_id || assetId;
    } else if (assetId) {
      const { data } = await admin
        .from("mux_assets")
        .select("*")
        .eq("mux_asset_id", assetId)
        .maybeSingle();
      muxAsset = data;
    }

    let asset: unknown = null;
    if (assetId) {
      const muxRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: muxAuthHeader() },
      });
      if (muxRes.ok) {
        const json = await muxRes.json();
        asset = json.data;
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