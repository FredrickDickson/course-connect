import { test, expect } from "@playwright/test";

/**
 * Admin Dashboard E2E Tests
 * Tests admin login, approving instructor applications, and role changes
 */

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin before each test
    await page.goto("/login");
    await page.fill('[name="email"]', "admin@example.com");
    await page.fill('[name="password"]', "AdminPassword123!");
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test("admin can access admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    
    // Should see admin dashboard content
    await expect(page.locator('text=/admin dashboard/i')).toBeVisible();
  });

  test("admin can view instructor applications", async ({ page }) => {
    await page.goto("/admin");
    
    // Click on applications tab
    await page.click('[data-testid="applications-tab"]');
    
    // Should see applications list
    await expect(page.locator('[data-testid="application-card"]')).toBeVisible();
  });

  test("admin can approve instructor application", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-testid="applications-tab"]');
    
    // Click review on first pending application
    await page.click('[data-testid="review-button"]:first-child');
    
    // Approve the application
    await page.click('[data-testid="approve-button"]');
    await page.click('[data-testid="confirm-approve"]');
    
    // Should see success message
    await expect(page.locator('text=/approved/i')).toBeVisible();
  });

  test("admin can change user role", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-testid="users-tab"]');
    
    // Find a user and change their role
    await page.click('[data-testid="role-select"]:first-child');
    await page.click('[data-value="instructor"]');
    
    // Should see confirmation or role updated
    await expect(page.locator('text=/role updated/i')).toBeVisible();
  });

  test("admin can view platform statistics", async ({ page }) => {
    await page.goto("/admin");
    
    // Should see stats cards
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount.greaterThan(0);
  });
});
