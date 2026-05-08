import fs from "node:fs";
import path from "node:path";

const AUDIT_LOG = path.resolve("test-results/audit.jsonl");
const REPORT = path.resolve("docs/agent/app-audit-report.md");

type Entry = { flow: string; status: string; notes?: string; duration_ms?: number; ts: string; screenshot?: string };

export default async function globalTeardown() {
  if (!fs.existsSync(AUDIT_LOG)) {
    console.warn("[audit] no audit.jsonl produced");
    return;
  }
  const lines = fs.readFileSync(AUDIT_LOG, "utf8").trim().split("\n").filter(Boolean);
  const entries: Entry[] = lines.map((l) => JSON.parse(l));

  const counts = entries.reduce((acc: Record<string, number>, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const byStatus = (s: string) => entries.filter((e) => e.status === s);

  const md = [
    `# CIMA Learn — App Audit Report`,
    ``,
    `_Generated ${new Date().toISOString()} from ${entries.length} flow checks._`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count |`,
    `|---|---|`,
    `| ✅ pass | ${counts.pass || 0} |`,
    `| 🟡 partial | ${counts.partial || 0} |`,
    `| 🔴 broken | ${counts.broken || 0} |`,
    `| ⚫ not_built | ${counts.not_built || 0} |`,
    ``,
  ];

  for (const status of ["broken", "not_built", "partial", "pass"] as const) {
    const rows = byStatus(status);
    if (!rows.length) continue;
    md.push(`## ${status.toUpperCase()} (${rows.length})`, ``, `| Flow | Notes | Duration |`, `|---|---|---|`);
    for (const r of rows) {
      const notes = (r.notes || "").replace(/\|/g, "\\|").slice(0, 200);
      md.push(`| \`${r.flow}\` | ${notes} | ${r.duration_ms ?? 0}ms |`);
    }
    md.push("");
  }

  md.push(
    `## How to re-run`,
    ``,
    "1. Seed test users: `bun run scripts/seed-e2e-users.ts` (requires `SUPABASE_SERVICE_ROLE_KEY`).",
    "2. Run the audit: `bunx playwright test`.",
    "3. Re-read this file.",
    "",
  );

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, md.join("\n"));
  console.log(`[audit] report → ${REPORT}`);
}