import { serve } from "https://deno.land/std/http/server.ts";

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

interface BrevoSender {
  name: string;
  email: string;
}

function parseFromAddress(from?: string): BrevoSender {
  const defaultEmail = Deno.env.get("EMAIL_FROM") || "noreply@thecima.org";
  const defaultName = Deno.env.get("EMAIL_FROM_NAME") || "CIMA Learn";

  if (!from) {
    return { name: defaultName, email: defaultEmail };
  }

  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  return { name: defaultName, email: from.trim() };
}

function toRecipientList(value?: string | string[]): Array<{ email: string }> {
  if (!value) return [];
  const emails = Array.isArray(value) ? value : [value];
  return emails.map((email) => ({ email: email.trim() })).filter((r) => r.email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const internalApiKey = Deno.env.get("INTERNAL_API_KEY");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ") ||
      authHeader.slice(7) !== internalApiKey
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not configured");
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

    const sender = parseFromAddress(payload.from);
    const to = toRecipientList(payload.to);

    const brevoBody: Record<string, unknown> = {
      sender,
      to,
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
    };

    const cc = toRecipientList(payload.cc);
    const bcc = toRecipientList(payload.bcc);
    if (cc.length > 0) brevoBody.cc = cc;
    if (bcc.length > 0) brevoBody.bcc = bcc;
    if (payload.replyTo) {
      brevoBody.replyTo = { email: payload.replyTo };
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(brevoBody),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (result as { message?: string }).message ||
        `Brevo API error (${response.status})`;
      throw new Error(message);
    }

    const messageId = (result as { messageId?: string }).messageId ?? null;
    console.log("Email sent successfully via Brevo:", messageId);

    return new Response(
      JSON.stringify({ success: true, id: messageId, provider: "brevo" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-email error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
