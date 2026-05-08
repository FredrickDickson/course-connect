import { test as base, TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export type AuditStatus = "pass" | "partial" | "broken" | "not_built";

export interface AuditEntry {
  flow: string;
  status: AuditStatus;
  notes?: string;
  screenshot?: string;
  duration_ms?: number;
  ts: string;
}

const AUDIT_DIR = path.resolve(process.cwd(), "test-results");
const AUDIT_LOG = path.join(AUDIT_DIR, "audit.jsonl");

function appendAudit(entry: AuditEntry) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + "\n");
}

export async function record<T>(
  info: TestInfo,
  flow: string,
  fn: () => Promise<{ status: AuditStatus; notes?: string }>,
) {
  const start = Date.now();
  let result: { status: AuditStatus; notes?: string };
  try {
    result = await fn();
  } catch (err: any) {
    result = { status: "broken", notes: err?.message ?? String(err) };
  }
  const screenshot = info.attachments.find((a) => a.name === "screenshot")?.path;
  appendAudit({
    flow,
    status: result.status,
    notes: result.notes,
    screenshot,
    duration_ms: Date.now() - start,
    ts: new Date().toISOString(),
  });
}

export const test = base;
export { expect } from "@playwright/test";