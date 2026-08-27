import { test, expect } from "@playwright/test";

// Regression coverage for the "blank white screen" bug: users occasionally
// loaded the app to a completely empty page (no spinner, no error, nothing
// in the DOM). Root causes were a service worker serving a stale cached app
// shell after a deploy, no top-level React ErrorBoundary, and no fallback
// content in index.html if the app's JS never ran at all. These tests guard
// each fix, plus a generic tripwire for the symptom itself.

const PUBLIC_ROUTES = ["/", "/login", "/register", "/course-catalog", "/help-center", "/this-route-does-not-exist"];

async function expectVisibleContent(page: import("@playwright/test").Page) {
  // page.goto only waits for the `load` event, not for the SPA's first
  // React render, so poll instead of reading innerText once - avoids
  // flagging the brief pre-hydration frame as a false "blank page".
  await expect
    .poll(async () => (await page.locator("body").innerText()).trim().length, { timeout: 10_000 })
    .toBeGreaterThan(0);
}

test.describe("Resilience — no blank page", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders visible content, never a blank page`, async ({ page }) => {
      await page.goto(route);
      await expectVisibleContent(page);
    });
  }
});

test.describe("Resilience — service worker", () => {
  test("navigations are network-first, not served purely from SW cache", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), undefined, { timeout: 30_000 });

    let sawNetworkRequestForDocument = false;
    page.on("request", (request) => {
      if (request.resourceType() === "document" && new URL(request.url()).pathname === "/") {
        sawNetworkRequestForDocument = true;
      }
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    expect(sawNetworkRequestForDocument).toBeTruthy();
  });

  test("stale cache entries are purged when the service worker activates", async ({ page }) => {
    test.setTimeout(60_000);

    // Seed a dummy entry under an old, no-longer-used cache name *before* any
    // page script runs, simulating a real returning visitor whose browser
    // still has a cache left behind by an older sw.js version. This avoids
    // manually unregistering/re-registering the SW mid-test, which races
    // with the browser's own (eventually-consistent) unregister bookkeeping.
    await page.addInitScript(async () => {
      const staleCache = await caches.open("cima-learn-cache-v2");
      await staleCache.put("/", new Response("STALE SHELL"));
    });

    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 30_000 });

    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames).not.toContain("cima-learn-cache-v2");
    expect(cacheNames).toContain("cima-learn-cache-v3");
  });
});

test.describe("Resilience — stuck-load watchdog", () => {
  test("shows a manual Reload option if the app's JS never mounts", async ({ page }) => {
    test.setTimeout(60_000);

    // Vite serves the entry module with a query string (e.g.
    // /src/main.tsx?v=<hash>), so the route pattern needs a trailing
    // wildcard to actually match and abort the request.
    await page.route("**/src/main.tsx*", (route) => route.abort());

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const reloadButton = page.getByRole("button", { name: /reload/i });
    await expect(reloadButton).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Resilience — top-level ErrorBoundary", () => {
  test("catches a render error and shows a fallback instead of a blank page", async ({ page }) => {
    await page.goto("/?__throwTestError=1");
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    await expectVisibleContent(page);
  });

  test("the same route without the trigger renders normally", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
