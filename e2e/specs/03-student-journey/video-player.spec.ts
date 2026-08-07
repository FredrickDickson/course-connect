import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VideoPlayerPage } from "../../pom/VideoPlayerPage";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { supabaseAdmin } from "../../fixtures/db";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "setup", ".auth");

async function getSeededLessonId(courseId: string, title: string): Promise<string> {
  const { data: courseModule, error: moduleError } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .single();
  if (moduleError) throw moduleError;
  const { data: lesson, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select("id")
    .eq("module_id", courseModule.id)
    .eq("title", title)
    .single();
  if (lessonError) throw lessonError;
  return lesson.id;
}

const getSeededFirstLessonId = (courseId: string) => getSeededLessonId(courseId, "Lesson 1: Getting Started");

test.describe("Video player — enrolled student", () => {
  test("renders lesson title, module badge, and navigation", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await expect(player.lessonTitle("Lesson 1: Getting Started")).toBeVisible();
    await expect(player.moduleBadge).toContainText("Module 1: Introduction");
    await expect(player.nextLessonButton).toBeVisible();
    await expect(player.nextLessonButton).toBeEnabled();
  });

  test("Next lesson navigates to the second seeded lesson", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await player.nextLessonButton.click();
    await expect(player.lessonTitle("Lesson 2: Core Concepts")).toBeVisible();
    // Last lesson in the course — no further "Next"; the same button shows
    // disabled "Course end" instead of a next lesson's title.
    await expect(player.nextLessonButton).toHaveText("Course end");
    await expect(player.nextLessonButton).toBeDisabled();
  });

  test("unknown lesson id shows a lesson-not-found state", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, "00000000-0000-0000-0000-000000000000");
    await expect(player.lessonNotFound).toBeVisible();
  });
});

test.describe("Video player — unenrolled student", () => {
  test.use({ storageState: path.join(authDir, "unenrolled-student.json") });

  test("shows access-denied instead of lesson content", async ({ page }) => {
    const courseId = await getSeededCourseId();
    // Lesson 1 is seeded as a free preview (is_preview: true) and is
    // deliberately viewable without enrollment — use lesson 2 to exercise
    // the actual enrollment gate.
    const lessonId = await getSeededLessonId(courseId, "Lesson 2: Core Concepts");
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await expect(player.notEnrolled).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).not.toBeVisible();
  });
});
