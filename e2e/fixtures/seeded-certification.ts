import { supabaseAdmin } from "./db";
import { getSeededCourseId } from "./seeded-course";
import { TEST_USERS } from "./test-users";

let cachedCertId: string | null = null;

/** Looks up the id of the certification seed-test-data.ts creates for the seeded student + seeded course. */
export async function getSeededCertificationId(): Promise<string> {
  if (cachedCertId) return cachedCertId;
  const courseId = await getSeededCourseId();
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", TEST_USERS.student.email)
    .single();
  if (userError) throw userError;

  const { data, error } = await supabaseAdmin
    .from("certifications")
    .select("id")
    .eq("user_id", userRow.id)
    .eq("course_id", courseId)
    .single();
  if (error) throw error;
  cachedCertId = data.id;
  return data.id;
}
