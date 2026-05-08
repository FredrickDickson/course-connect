import { test, expect, record } from "./fixtures/audit";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";

const sb = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

test.describe("Edge functions smoke", () => {
  const fns = [
    { name: "quiz-submit", body: { quizId: "00000000-0000-0000-0000-000000000000", answers: {} } },
    { name: "renewal-reminders", body: { dryRun: true } },
    { name: "send-email", body: { to: "noreply@cima-test.dev", subject: "test", html: "<p>test</p>" } },
    { name: "paystack-course-initialize", body: { courseId: "00000000-0000-0000-0000-000000000000" } },
    { name: "admin-setup", body: {} },
  ];

  for (const fn of fns) {
    test(`invoke ${fn.name}`, async ({}, info) => {
      await record(info, `edge:${fn.name}`, async () => {
        if (!sb) return { status: "broken", notes: "Supabase env vars missing in test runner" };
        const { data, error } = await sb.functions.invoke(fn.name, { body: fn.body });
        if (error) {
          // Distinguish auth/validation (function alive) vs real failure
          const msg = error.message || String(error);
          if (/401|403|400|validation|invalid/i.test(msg)) return { status: "partial", notes: `Reachable; ${msg.slice(0, 120)}` };
          return { status: "broken", notes: msg.slice(0, 200) };
        }
        return { status: "pass", notes: JSON.stringify(data).slice(0, 160) };
      });
    });
  }
});