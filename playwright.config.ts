import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
  timeout: 45_000,
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/html" }]],
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
});
