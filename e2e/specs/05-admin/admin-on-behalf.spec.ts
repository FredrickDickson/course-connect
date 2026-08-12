import { test, expect } from "@playwright/test";
import { login } from "../../fixtures/users";
import { supabaseAdmin } from "../../fixtures/db";
import { TEST_USERS } from "../../fixtures/test-users";

test.describe("Admin on-behalf instructor flow", () => {
  test("admin can create a course on behalf of an instructor and open curriculum builder", async ({ page }) => {
    await login(page, "admin");

    const { data: instructor, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", TEST_USERS.instructor.email)
      .single();

    expect(error).toBeNull();
    expect(instructor?.id).toBeTruthy();
    const instructorId = instructor.id;

    await page.goto(`/admin/courses/new?instructorId=${instructorId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Create New Course")).toBeVisible();
    await expect(page.getByText("Admin Mode")).toBeVisible();
    await expect(page.getByText(`Acting as: ${TEST_USERS.instructor.firstName} ${TEST_USERS.instructor.lastName}`)).toBeVisible();

    const title = `E2E Admin On Behalf Course ${Date.now()}`;
    await page.getByLabel("Course Title *").fill(title);
    await page.getByLabel("Course Subtitle *").fill("Created by admin on behalf of instructor");
    await page.getByLabel("Course Description *").fill("This course was created by admin acting on behalf of a seeded instructor.");
    await page.getByLabel("Category *").click();
    await page.getByRole("option", { name: "E2E Seed Category" }).click();
    await page.getByLabel("Price *").fill("149");

    await Promise.all([
      page.waitForURL(/\/admin\/courses\/[^/]+\/curriculum/, { timeout: 15000 }),
      page.getByRole("button", { name: /create course/i }).click(),
    ]);

    await expect(page.getByText("Add Section")).toBeVisible({ timeout: 15000 });

    await supabaseAdmin.from("courses").delete().eq("title", title);
  });
});
