import { test, expect } from "@playwright/test";
import { CourseCurriculumPage } from "../../pom/instructor/CourseCurriculumPage";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { supabaseAdmin } from "../../fixtures/db";

test.describe("Course curriculum builder (/instructor/courses/:id/curriculum)", () => {
  test("shows the seeded module, expandable to reveal its lessons", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const curriculum = new CourseCurriculumPage(page);
    await curriculum.goto(courseId);
    await expect(curriculum.moduleHeader("Module 1: Introduction")).toBeVisible();
    await curriculum.expandModule("Module 1: Introduction");
    await expect(page.getByText("Lesson 1: Getting Started")).toBeVisible();
    await expect(page.getByText("Lesson 2: Core Concepts")).toBeVisible();
  });

  test("adding a new section appears in the curriculum", async ({ page }) => {
    // This test mutates the SHARED seeded course (real insert, not a mock) —
    // clean up the section it creates so repeated runs don't permanently
    // accumulate modules on the fixture course (which would also break
    // seed-test-data.ts's findOrCreateModule lookup, as it once did here).
    const courseId = await getSeededCourseId();
    const curriculum = new CourseCurriculumPage(page);
    await curriculum.goto(courseId);
    await curriculum.addSectionButton.click();
    const sectionTitle = `E2E Section ${Date.now()}`;
    await curriculum.sectionTitleInput.fill(sectionTitle);
    await curriculum.sectionDescInput.fill("Added by the Playwright suite.");
    await page.getByRole("button", { name: "Add Section" }).click();
    await expect(page.getByText("Section added successfully!", { exact: true })).toBeVisible();
    await expect(curriculum.moduleHeader(sectionTitle)).toBeVisible();

    await supabaseAdmin.from("modules").delete().eq("course_id", courseId).eq("title", sectionTitle);
  });
});
