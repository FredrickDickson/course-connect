import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VideoPlayerPage } from "../../pom/VideoPlayerPage";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { supabaseAdmin } from "../../fixtures/db";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "setup", ".auth");

async function getSeededFirstLessonId(courseId: string): Promise<string> {
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
    .eq("title", "Lesson 1: Getting Started")
    .single();
  if (lessonError) throw lessonError;
  return lesson.id;
}

test.describe("Video player — enrolled student", () => {
  test("renders lesson title, module badge, and navigation", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await expect(player.lessonTitle).toHaveText("Lesson 1: Getting Started");
    await expect(player.moduleBadge).toHaveText("Module 1: Introduction");
    await expect(player.nextLessonButton).toBeVisible();
  });

  test("Next lesson navigates to the second seeded lesson", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await player.nextLessonButton.click();
    await expect(player.lessonTitle).toHaveText("Lesson 2: Core Concepts");
    // Last lesson in the course — no further "Next", shows disabled "Course Complete" instead.
    await expect(player.courseCompleteButton).toBeVisible();
    await expect(player.courseCompleteButton).toBeDisabled();
  });

  test("notes tab lets the student type and save a note", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await player.notesTab.click();
    await player.notesTextarea.fill("My E2E test note");
    await expect(player.notesTextarea).toHaveValue("My E2E test note");
    await player.saveNotesButton.click();
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
    const lessonId = await getSeededFirstLessonId(courseId);
    const player = new VideoPlayerPage(page);
    await player.goto(courseId, lessonId);
    await expect(player.notEnrolled).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).not.toBeVisible();
  });
});
