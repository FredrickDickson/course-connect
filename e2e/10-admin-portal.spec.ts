/**
 * Admin Portal E2E Tests
 * Tests the new admin portal UI with sidebar and top navigation
 */

import { test, expect } from "@playwright/test";
import { login } from "./fixtures/users";
import { supabaseAdmin } from "./fixtures/db";
import { TEST_USERS } from "./fixtures/test-users";

test.describe("Admin Portal - UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
  });

  test("admin portal loads with new layout", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Check for sidebar
    const sidebar = page.locator('[class*="sidebar" i], aside');
    await expect(sidebar).toBeVisible();

    // Check for top navbar
    const topNav = page.locator('nav');
    await expect(topNav).toBeVisible();

    // Check for search bar in top nav
    const searchBar = page.locator('input[placeholder*="search" i]');
    await expect(searchBar).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Find and click Overview link in sidebar
    const overviewLink = page.locator('text=Overview').first();
    await overviewLink.click();
    await expect(page).toHaveURL(/admin.*tab=overview/);

    // Click Courses link
    const coursesLink = page.locator('text=Courses').first();
    await coursesLink.click();
    await expect(page).toHaveURL(/admin.*tab=courses/);

    // Click Members link
    const membersLink = page.locator('text=Members').first();
    await membersLink.click();
    await expect(page).toHaveURL(/admin.*tab=members/);
  });

  test("sidebar is collapsible", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Find collapse toggle button
    const collapseButton = page.locator('button[aria-label*="collapse" i], button[aria-label*="expand" i]').first();
    
    if (await collapseButton.isVisible()) {
      // Get sidebar width before
      const sidebar = page.locator('aside').first();
      const beforeBox = await sidebar.boundingBox();

      // Click toggle
      await collapseButton.click();
      await page.waitForTimeout(500); // Wait for animation

      // Check sidebar width changed
      const afterBox = await sidebar.boundingBox();
      expect(afterBox?.width).not.toBe(beforeBox?.width);
    }
  });

  test("admin top nav has profile dropdown", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Find user avatar/profile button
    const profileButton = page.locator('[class*="avatar" i], button:has-text("Admin")').last();
    
    if (await profileButton.isVisible()) {
      await profileButton.click();
      
      // Check for dropdown menu items
      const signOutButton = page.locator('text=Sign Out, text=Log Out').last();
      await expect(signOutButton).toBeVisible();
    }
  });

  test("notifications bell is visible", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Look for notification icon
    const notificationBell = page.locator('[class*="bell" i], svg[class*="lucide-bell" i]').first();
    await expect(notificationBell).toBeVisible({ timeout: 5000 });
  });

  test("admin can create a course on behalf of an instructor", async ({ page }) => {
    await login(page, "admin");

    const { data: instructor } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", TEST_USERS.instructor.email)
      .single();

    expect(instructor?.id).toBeTruthy();
    const instructorId = instructor.id;

    await page.goto(`/admin/courses/new?instructorId=${instructorId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Create New Course")).toBeVisible();
    await expect(page.locator("text=Admin Mode")).toBeVisible();
    await expect(page.locator(`text=Acting as: ${TEST_USERS.instructor.firstName} ${TEST_USERS.instructor.lastName}`)).toBeVisible();

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

    await expect(page.locator("text=Add Section")).toBeVisible({ timeout: 15000 });

    await supabaseAdmin.from("courses").delete().eq("title", title);
  });
});

test.describe("Admin Dashboard - Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
  });

  test("overview tab shows statistics", async ({ page }) => {
    // Click Overview tab
    await page.locator('text=Overview').first().click();
    await page.waitForLoadState("networkidle");

    // Look for stat cards (enrollment counts, revenue, etc.)
    const statCards = page.locator('[class*="card" i]');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("enrollments tab is accessible", async ({ page }) => {
    await page.locator('text=Enrollments').first().click();
    await page.waitForLoadState("networkidle");

    // Check URL contains enrollments tab
    await expect(page).toHaveURL(/tab=enrollments/);

    // Check for enrollment table or list
    const enrollmentContent = page.locator('table, [class*="enrollment" i]');
    await expect(enrollmentContent).toBeVisible({ timeout: 10000 });
  });

  test("courses tab shows course list", async ({ page }) => {
    await page.locator('text=Courses').first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/tab=courses/);

    // Check for course table or cards
    const courseContent = page.locator('table, [class*="course" i]').first();
    await expect(courseContent).toBeVisible({ timeout: 10000 });
  });

  test("users tab is accessible", async ({ page }) => {
    await page.locator('text=Users').first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/tab=users/);

    // Check for user management content
    const userContent = page.locator('table, [class*="user" i]').first();
    await expect(userContent).toBeVisible({ timeout: 10000 });
  });

  test("applications tab shows pending count badge", async ({ page }) => {
    // Look for Applications tab with badge
    const applicationsTab = page.locator('text=Applications').first();
    await expect(applicationsTab).toBeVisible();

    // Click it
    await applicationsTab.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/tab=applications/);
  });
});

test.describe("Admin Dashboard - Mobile Responsiveness", () => {
  test("mobile menu works", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Look for mobile menu button (hamburger)
    const mobileMenuButton = page.locator('button:has-text("Menu"), [aria-label*="menu" i]').first();
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);

      // Check if sidebar/menu is now visible
      const sidebar = page.locator('aside, [role="dialog"]');
      await expect(sidebar).toBeVisible();
    }
  });

  test("mobile header is visible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Check for mobile header with logo
    const mobileLogo = page.locator('img[alt*="CIMA" i], img[alt*="logo" i]').first();
    await expect(mobileLogo).toBeVisible();
  });
});

test.describe("Admin Dashboard - URL State Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
  });

  test("direct navigation to tab works", async ({ page }) => {
    // Navigate directly to courses tab via URL
    await page.goto("/admin?tab=courses");
    await page.waitForLoadState("networkidle");

    // Verify courses tab is active
    const coursesTab = page.locator('text=Courses').first();
    const isActive = await coursesTab.evaluate((el) => 
      el.getAttribute('data-state') === 'active' || 
      el.classList.contains('active') ||
      el.getAttribute('aria-selected') === 'true'
    );
    
    expect(isActive).toBeTruthy();
  });

  test("browser back button works", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Navigate to courses
    await page.locator('text=Courses').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/tab=courses/);

    // Navigate to users
    await page.locator('text=Users').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/tab=users/);

    // Go back
    await page.goBack();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/tab=courses/);
  });
});

test.describe("Admin Dashboard - Performance", () => {
  test("dashboard loads within acceptable time", async ({ page }) => {
    await login(page, "admin");
    
    const startTime = Date.now();
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("tab switching is fast", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const startTime = Date.now();
    await page.locator('text=Courses').first().click();
    await page.waitForLoadState("networkidle");
    const switchTime = Date.now() - startTime;

    // Tab switching should be instant (< 500ms)
    expect(switchTime).toBeLessThan(500);
  });
});

test.describe("Admin Dashboard - Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const h1Text = await h1.textContent();
    expect(h1Text).toContain('Admin');
  });

  test("navigation links have proper aria labels", async ({ page }) => {
    const navLinks = page.locator('nav a, aside a');
    const count = await navLinks.count();

    expect(count).toBeGreaterThan(0);

    // Check first few links have text or aria-label
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test("sidebar toggle has aria label", async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="collapse" i], button[aria-label*="expand" i]').first();
    
    if (await toggleButton.isVisible()) {
      const ariaLabel = await toggleButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

test.describe("Admin Dashboard - Edge Cases", () => {
  test("handles network errors gracefully", async ({ page, context }) => {
    await login(page, "admin");
    
    // Simulate offline
    await context.setOffline(true);
    await page.goto("/admin");
    
    // Should show some error state or cached content
    // Not crash completely
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    
    await context.setOffline(false);
  });

  test("handles missing tabs gracefully", async ({ page }) => {
    await login(page, "admin");
    
    // Try to navigate to non-existent tab
    await page.goto("/admin?tab=nonexistent");
    await page.waitForLoadState("networkidle");

    // Should either redirect to overview or show error
    const url = page.url();
    expect(url).toContain('/admin');
  });
});
