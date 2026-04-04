import { test, expect } from "@playwright/test";

/**
 * Checkout Flow E2E Tests
 * Tests browsing course, initiating payment, and confirming enrollment
 */

test.describe("Checkout Flow", () => {
  test("user can browse course catalog", async ({ page }) => {
    // Navigate to course catalog
    await page.goto("/courses");
    
    // Should see list of courses
    await expect(page.locator('[data-testid="course-card"]')).toHaveCount.greaterThan(0);
  });

  test("user can view course details", async ({ page }) => {
    await page.goto("/courses");
    
    // Click on first course
    await page.click('[data-testid="course-card"]:first-child');
    
    // Should see course details
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="course-description"]')).toBeVisible();
  });

  test("authenticated user can initiate checkout", async ({ page }) => {
    // Log in first
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    
    // Navigate to course and initiate checkout
    await page.goto("/courses");
    await page.click('[data-testid="course-card"]:first-child');
    await page.click('[data-testid="enroll-button"]');
    
    // Should be on checkout page
    await expect(page).toHaveURL(/.*checkout.*/);
  });

  test("user is enrolled after successful payment", async ({ page }) => {
    // This test would require mocking Paystack payment
    // Placeholder for payment success flow
    
    await page.goto("/payment-success");
    
    // Should see success message
    await expect(page.locator('text=/successfully enrolled/i')).toBeVisible();
  });
});
