/**
 * One-shot seed for Playwright audit suite.
 * Idempotent: only touches *@cima-test.dev rows.
 * Usage: bun run scripts/seed-e2e-users.ts
 * Required env: VITE_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SRK) throw new Error("Set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

const SEEDS = [
  { email: "student@cima-test.dev", password: "StudentPass123!", role: "student", first: "Test", last: "Student" },
  { email: "instructor@cima-test.dev", password: "InstructorPass123!", role: "instructor", first: "Test", last: "Instructor" },
  { email: "admin@cima-test.dev", password: "AdminPass123!", role: "admin", first: "Test", last: "Admin" },
  { email: "applicant@cima-test.dev", password: "ApplicantPass123!", role: "student", first: "Test", last: "Applicant" },
];

async function ensureUser(s: typeof SEEDS[number]) {
  // Try to find an existing user by email (paged listUsers).
  let existing: any = null;
  for (let page = 1; page <= 10 && !existing; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    existing = data?.users?.find((u: any) => u.email?.toLowerCase() === s.email);
    if (!data?.users?.length) break;
  }
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await sb.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
      user_metadata: { first_name: s.first, last_name: s.last, role: s.role },
    });
    if (error) throw error;
    userId = data.user!.id;
    console.log(`✓ created ${s.email}`);
  } else {
    await sb.auth.admin.updateUserById(userId, { password: s.password, email_confirm: true });
    console.log(`✓ refreshed ${s.email}`);
  }

  // Update users.role
  await sb.from("users").update({ role: s.role }).eq("id", userId);
}

for (const s of SEEDS) {
  try {
    await ensureUser(s);
  } catch (e: any) {
    console.error(`✗ ${s.email}: ${e.message ?? e}`);
  }
}

console.log("Seed complete.");