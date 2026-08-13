import { describe, it, expect } from "vitest";
import { processAutoRenewals } from "../server/services/auto-renewal";

describe("auto-renewal service", () => {
  it("exports processAutoRenewals function", () => {
    expect(typeof processAutoRenewals).toBe("function");
  });
});
