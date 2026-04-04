import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 * Tests user sign up, log in, log out, and role-gated access
 */

test.describe("Authentication Flow", () => {
  test("user can sign up with email and password", async ({ page }) => {
    // Navigate to register page
    await page.goto("/register");
    
    // Fill registration form
    await page.fill('[name="firstName"]', "Test");
    await page.fill('[name="lastName"]', "User");
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', "Password123!");
    await page.fill('[name="confirmPassword"]', "Password123!");
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test("user can log in with valid credentials", async ({ page }) => {
    await page.goto("/login");
    
    // Fill login form
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "Password123!");
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test("user can log out", async ({ page }) => {
    // First log in
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Click logout button
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to landing page
    await expect(page).toHaveURL("/");
  });

  test("student is redirected from instructor dashboard", async ({ page }) => {
    // Log in as student
    await page.goto("/login");
    await page.fill('[name="email"]', "student@example.com");
    await page.fill('[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    
    // Try to access instructor page
    await page.goto("/instructor");
    
    // Should be redirected to dashboard
    await expect(page).not.toHaveURL(/.*instructor.*/);
  });

  test("non-admin is redirected from admin dashboard", async ({ page }) => {
    // Log in as regular user
    await page.goto("/login");
    await page.fill('[name="email"]', "student@example.com");
    await page.fill('[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    
    // Try to access admin page
    await page.goto("/admin");
    
    // Should be redirected away from admin
    await expect(page).not.toHaveURL(/.*admin.*/);
  });
});
