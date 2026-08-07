import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to seed/verify e2e test data.",
  );
}

/**
 * Safety rail: refuse to run against a project that doesn't look like the one
 * this repo already targets, unless explicitly confirmed. There's currently
 * only one Supabase project (no separate staging/test project), so this is a
 * guard against pointing E2E seeding at the wrong env var file, not a
 * guarantee of a dedicated test project.
 */
const EXPECTED_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID;
if (EXPECTED_PROJECT_ID && !url.includes(EXPECTED_PROJECT_ID)) {
  if (process.env.E2E_SEED_CONFIRM !== "yes") {
    throw new Error(
      `VITE_SUPABASE_URL (${url}) does not match VITE_SUPABASE_PROJECT_ID (${EXPECTED_PROJECT_ID}). ` +
        "Refusing to seed. Set E2E_SEED_CONFIRM=yes to override.",
    );
  }
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
