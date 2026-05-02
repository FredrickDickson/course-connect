



# CIMA Learn — Automation Workflow Catalog

You already have a solid foundation at `@c:\Users\Administrator\Documents\projects\course-connect\n8n\README.md:1-242` (40 workflows across 10 phases). Below is the full landscape of automations your app can benefit from — existing ones marked ✅, suggested additions marked 🆕. Grouped by business domain.

## 1. Payments & Enrollment

- **✅ WF01 — Payment confirmed → enrollment**: Paystack webhook → create enrollment → send receipt + welcome email + WhatsApp group invite.
- **✅ WF03 — Admin mark-as-paid**: Manual confirmation triggers same enrollment chain (for bank/offline payers).
- **✅ WF17 — Failed payment retry**: Paystack failure → 1h/24h/3d retry emails with one-click resume link.
- **🆕 Abandoned checkout recovery**: Detect users who hit `/checkout` but didn't complete Paystack → 1h + 24h reminder with discount code option.
- **🆕 Refund request workflow**: Support form → admin approval in Slack → Paystack refund API → ledger entry → email confirmation.
- **🆕 Installment/payment-plan tracking**: Scheduled check for overdue installments → reminder → auto-suspend access after grace period.
- **🆕 Multi-currency FX sync**: Daily pull exchange rates → update `currency_rates` table (aligns with `@c:\Users\Administrator\Documents\projects\course-connect\docs\curency selector`).
- **🆕 Invoice/receipt PDF generator**: On payment → generate branded PDF → upload to storage → attach to email.

## 2. Course Lifecycle

- **✅ WF04 — Waitlist cascade**: When a seat opens, offer to next waitlisted user with 24h claim window.
- **✅ WF09 — 7-day joining instructions**: Drip email with Zoom link, prep materials, calendar invite.
- **✅ WF10 — Course-end feedback survey**: NPS + qualitative questions 24h after last session.
- **✅ WF11 — New course member blast**: Segment-based announcement.
- **✅ WF12 — Capacity 90% alert**: Slack ping to admin to open second cohort.
- **✅ WF34/35/36** — Publishing notifications, content update alerts, quiz deadline reminders.
- **🆕 Automatic cohort creation**: When cohort hits capacity → clone next cohort with +N weeks start date.
- **🆕 Pre-course readiness check**: 48h before start → verify each student has account setup, paid, joined WhatsApp group → escalate missing ones.
- **🆕 Attendance auto-tracking**: Pull Zoom attendance report → flag < 75% attendance → notify student + instructor.
- **🆕 Recording distribution**: New Zoom recording → transcode → upload to storage → email link to enrolled students only.

## 3. Qualification Pathways & Certification

Given `@c:\Users\Administrator\Documents\projects\course-connect\docs\qualification pathways` and [certification/](cci:9://file:///c:/Users/Administrator/Documents/projects/course-connect/docs/certification:0:0-0:0) folders:

- **✅ WF06 — Renewal → certificate generation**.
- **✅ WF33 — Certificate expiry reminders**.
- **🆕 Pathway progress tracker**: Nightly job recomputes each student's pathway completion % → unlock next module → email milestone badge.
- **🆕 Expedited route eligibility checker**: Scan transcripts/uploaded credentials against rules in `expedited routes.md` → notify eligible students with one-click application.
- **🆕 Certificate issuance pipeline**: On course completion → verify grade threshold → generate PDF with QR verification URL → email + add to profile.
- **🆕 Credential verification endpoint**: Public webhook (`/verify/:cert_id`) → lookup → return JSON for third parties/employers.
- **🆕 CPD hours accumulator**: Monthly tally of CPD events per member → push to profile dashboard.

## 4. Membership & Renewals

- **✅ WF05 — Renewal reminders at 60/30/7/0/-30 days**.
- **✅ WF25/26 — Legacy student import + renewal nudges**.
- **🆕 Auto-downgrade on lapse**: -60 days post-expiry → downgrade role to `alumni` → restrict paid content.
- **🆕 Win-back campaign**: 90/180 days after lapse → personalised re-enrollment email with what's-new summary.
- **🆕 Membership tier upgrade trigger**: When user hits X courses/CPD hours → auto-promote tier + send badge.

## 5. User Onboarding & Engagement

- **✅ WF31 — Welcome sequence**, **WF32 — Email verification reminders**, **WF37 — Inactive re-engagement**.
- **🆕 Profile completion nudge**: If profile < 70% complete after 3 days → reminder with direct link to missing fields.
- **🆕 First-login tour trigger**: Post-signup → schedule "how to navigate" email day 1/3/7.
- **🆕 Birthday / anniversary emails**: Personal touch, optional discount.
- **🆕 Learning streak tracker**: Daily login streak → gamified email ("Don't break your 7-day streak!").

## 6. Community & Forum

- **✅ WF13 — AI moderation**, **WF14 — @mentions**, **WF15 — weekly digest**, **WF38 — unanswered question reminders**.
- **🆕 Toxic content auto-quarantine**: OpenAI moderation score > threshold → hide post → Slack review queue.
- **🆕 Top contributor leaderboard**: Weekly aggregation → email + public leaderboard update.
- **🆕 Expert-tag routing**: Question tagged `#tax` routes to instructors who opted-in for that tag.

## 7. Assessments & AI Grading

- **✅ WF21 — MCQ auto-grading**, **WF22 — AI written grader**, **WF24 — Mock arbitration simulator**, **WF27 — AI feedback agent**, **WF30 — Assignment deadline reminders**.
- **🆕 Plagiarism check**: On assignment submit → run through detection API → flag → notify instructor.
- **🆕 Adaptive retake**: Fail < 50% on MCQ → auto-assign targeted remedial micro-lesson before retake.
- **🆕 Exam integrity alerts**: Detect tab-switching / copy-paste events → log → alert instructor.
- **🆕 Rubric-based grade normalization**: Weekly job to detect grader bias across instructors → report to admin.

## 8. Instructor Operations

- **✅ WF23 — AI instructor auto-replies**, **WF28 — Application notifications**, **WF29 — Payout processing**.
- **🆕 Instructor onboarding checklist**: Approved application → provision account, assign mentor, send training videos, track completion.
- **🆕 Session prep reminder**: 24h before class → email lesson plan, roster, past feedback.
- **🆕 Performance dashboard digest**: Weekly — ratings, completion rates, response time — to each instructor.
- **🆕 Contract renewal / tax doc collection**: Annual reminder for W9/KYC docs before payout.

## 9. Admin, Reporting & Ops

- **✅ WF16 — Daily admin briefing** (enrollments, revenue, expiries).
- **🆕 Weekly KPI report to Google Sheets / Slack**: New signups, MRR, churn, NPS, support SLA.
- **🆕 Month-end financial close**: Paystack payouts vs enrollments reconciliation → flag mismatches.
- **🆕 Support ticket SLA escalation**: Ticket > 24h unanswered → escalate in Slack.
- **🆕 Broken-link / 404 monitor**: Daily crawl → report dead links (complements `@c:\Users\Administrator\Documents\projects\course-connect\docs\400-ERROR-FIXES.md`).
- **🆕 Database health snapshot**: Nightly Supabase advisor scan → email issues (using the `mcp0_get_advisors` pattern).
- **🆕 Backup verification**: Daily check that last Supabase backup succeeded; alert if not.

## 10. Marketing & Growth

- **✅ WF39 — Review collection**.
- **✅ WF40 — LinkedIn content automation**: 3x daily posts (9 AM, 12:30 PM, 5:30 PM) with AI-generated content in Mohammed Talib's authoritative style using Google Gemini 1.5 Flash (free), Google Search API for research on ADR/AI/Cybersecurity/Tech News/Current Affairs (free), Google Drive storage, Google Sheets logging with engagement tracking, manual approval workflow before publishing to LinkedIn personal profile.
- **✅ WF41 — LinkedIn Enhanced (No Image)**: Enhanced ghostwriter prompt with elite institutional tone, Google Search research, Google Gemini content generation using "Rule of Three" analysis, CIMA Connection integration, British English, max 3 hashtags, Google Drive/Sheets storage, manual approval workflow.
- **✅ WF42 — LinkedIn Enhanced (With Image)**: Enhanced ghostwriter prompt with elite institutional tone, Google Search research, Google Gemini content generation, Hugging Face image generation with brand palette (Deep Crimson Red & Achievement Amber), Google Drive/Sheets storage, manual approval workflow with image attachment to LinkedIn.
- **🆕 Testimonial pipeline**: 5-star review → ask consent → auto-post to landing page CMS.
- **🆕 Referral program**: Generate unique code → track signups → credit rewards automatically.
- **🆕 SEO content repurposing**: New blog → auto-generate LinkedIn/Twitter/WhatsApp teaser via AI → schedule.
- **🆕 Lead magnet delivery**: Form submit → deliver free e-book → tag lead → drip nurture sequence.
- **🆕 Paid ad retargeting sync**: Daily export of non-converters → push to Meta/Google Ads custom audience.

## 11. Compliance, Security & Data

- **🆕 GDPR data export/deletion requests**: User form → gather data from Supabase → zip → email → purge after verification.
- **🆕 Role-change audit log**: Any privileged role mutation → append to `audit_log` + Slack alert.
- **🆕 Failed-login anomaly detection**: Spike in failed logins per account/IP → temp lock + notify user.
- **🆕 Expired API key / cert rotation reminder**: Monthly check of Paystack, Resend, storage, SSL expiry.

## 12. Integrations (suggested glue workflows)

- **🆕 Supabase → CRM sync** (HubSpot / Zoho) for sales follow-up.
- **🆕 Supabase → MailerLite / Resend audience sync** for segmented campaigns.
- **🆕 Calendly / Zoom provisioning** on cohort creation.
- **🆕 WhatsApp Business broadcast API** for cohort-specific announcements.
- **🆕 Telegram/Discord mirror** of key community channels.

---

## Recommended Prioritization for New Additions

Top 10 highest-ROI additions to layer on your existing Phase 1–9:

1. **Abandoned checkout recovery** — direct revenue lift.
2. **Invoice/receipt PDF generator** — compliance + professionalism.
3. **Pathway progress tracker** + **Expedited route eligibility checker** — core to CIMA value prop.
4. **Attendance auto-tracking** from Zoom.
5. **Recording distribution pipeline**.
6. **Referral program**.
7. **GDPR data export/deletion**.
8. **Support ticket SLA escalation**.
9. **Win-back campaign** for lapsed members.
10. **Weekly KPI report** to Slack/Sheets.
