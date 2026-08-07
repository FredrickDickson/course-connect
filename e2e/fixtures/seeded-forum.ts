import { supabaseAdmin } from "./db";
import { E2E_SEED_FORUM_CATEGORY_SLUG, E2E_SEED_FORUM_BOARD_SLUG } from "./test-users";

let cachedCategoryId: string | null = null;

export async function getSeededForumCategoryId(): Promise<string> {
  if (cachedCategoryId) return cachedCategoryId;
  const { data, error } = await supabaseAdmin
    .from("forum_categories")
    .select("id")
    .eq("slug", E2E_SEED_FORUM_CATEGORY_SLUG)
    .single();
  if (error) throw error;
  cachedCategoryId = data.id;
  return data.id;
}

let cachedBoardId: string | null = null;

export async function getSeededForumBoardId(): Promise<string> {
  if (cachedBoardId) return cachedBoardId;
  const { data, error } = await supabaseAdmin
    .from("forum_boards")
    .select("id")
    .eq("slug", E2E_SEED_FORUM_BOARD_SLUG)
    .single();
  if (error) throw error;
  cachedBoardId = data.id;
  return data.id;
}
