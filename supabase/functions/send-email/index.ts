import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal API key to prevent unauthorized access
    const authHeader = req.headers.get("Authorization");
    const internalApiKey = Deno.env.get("INTERNAL_API_KEY");
    
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== internalApiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.subject || (!payload.html && !payload.text)) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, and html or text",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const from = payload.from || "CIMA Learn <noreply@thecima.org>";

    const response = await resend.emails.send({
      from,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      cc: payload.cc,
      bcc: payload.bcc,
    });

    console.log("Email sent successfully:", response.id);

    return new Response(JSON.stringify({ success: true, id: response.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-email error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});