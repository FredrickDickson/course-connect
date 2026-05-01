Alright — setting up Resend with Supabase is actually straightforward, but there are two correct ways to do it depending on your architecture.

I’ll give you the recommended production setup (Edge Functions) and the simpler alternative.

🎯 OPTION A (RECOMMENDED): Supabase Edge Functions + Resend

👉 This is the clean, scalable way (and matches your current system with webhooks, payments, etc.)

🧩 STEP 1: Install Resend in Supabase Function

Inside your Supabase project:

supabase functions new send-email

Then:

cd supabase/functions/send-email
npm install resend
🔐 STEP 2: Add Resend API Key

Go to Resend dashboard → API Keys

Then in Supabase:

supabase secrets set RESEND_API_KEY=your_api_key_here
✉️ STEP 3: Write the Email Function
import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    const response = await resend.emails.send({
      from: "CIMA Learn <noreply@yourdomain.com>",
      to,
      subject,
      html,
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }
});
🚀 STEP 4: Deploy Function
supabase functions deploy send-email
🔗 STEP 5: Call It From Your App

From your frontend or backend:

await fetch("/functions/v1/send-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "user@email.com",
    subject: "Enrollment पुष्टि",
    html: "<h1>You're enrolled!</h1>",
  }),
});
🎯 OPTION B: Use Resend Directly (Server/API Route)

If you already have:

/api/send-email

Then just install:

npm install resend

And:

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const { to, subject, html } = req.body;

  const data = await resend.emails.send({
    from: "CIMA Learn <noreply@yourdomain.com>",
    to,
    subject,
    html,
  });

  res.status(200).json(data);
}
🧠 WHEN TO USE EACH
Option	Use When
Edge Function ✅	You use Supabase backend logic (recommended)
API Route	You have Node/Next.js backend
🔥 WHERE YOU SHOULD USE EMAILS IN YOUR SYSTEM

Based on your platform, trigger emails on:

✅ 1. Enrollment Success
Subject: You're Enrolled 🎉
✅ 2. Payment Confirmation
Subject: Payment Received
✅ 3. Certificate Issued
Subject: Your Certificate is Ready 🏆
✅ 4. Admin Approval (Fellow)
Subject: Application Approved
✅ 5. Under Review
Subject: Your Application is Under Review
🧩 BONUS: Domain Setup (IMPORTANT)

In Resend:

Add your domain (e.g. mail.cimalearn.com)
Add DNS records (SPF, DKIM)
Verify domain

👉 Without this:

Emails go to spam ❌
🔐 BEST PRACTICES
✅ Use a proper sender
noreply@cimalearn.com
support@cimalearn.com
✅ Use templates

Create reusable HTML templates:

enrollment-confirmation.html
certificate-issued.html
approval-email.html
✅ Trigger from backend events

Best places in your system:

After Paystack webhook
After certificate generation
After admin approval
🚀 FINAL RECOMMENDATION

Use:

Supabase Edge Functions + Resend

Because your system already uses:

Webhooks
Server logic
Automation
🧠 ONE-LINE SUMMARY
Use Resend inside Supabase Edge Functions to send transactional emails triggered by your backend 