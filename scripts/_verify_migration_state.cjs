/**
 * One-off diagnostic: for each local migration file whose version isn't recorded
 * in supabase_migrations.schema_migrations, extract the DB objects it defines
 * (tables, columns, functions, types, indexes, policies) and check whether they
 * already exist on the remote DB. Classifies each file as APPLIED / NOT_APPLIED /
 * AMBIGUOUS / NO_SIGNATURE so a human can decide what to do with the ambiguous ones.
 */
require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MIG_DIR = path.join(__dirname, "..", "supabase", "migrations");

function extractSignatures(sql) {
  const sigs = [];
  let m;

  const tableRe = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi;
  while ((m = tableRe.exec(sql))) sigs.push({ kind: "table", name: m[1] });

  const typeRe = /CREATE TYPE\s+(?:public\.)?"?(\w+)"?/gi;
  while ((m = typeRe.exec(sql))) sigs.push({ kind: "type", name: m[1] });

  const funcRe = /CREATE (?:OR REPLACE )?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
  while ((m = funcRe.exec(sql))) sigs.push({ kind: "function", name: m[1] });

  const colRe = /ALTER TABLE\s+(?:IF EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?(\w+)"?\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/gi;
  while ((m = colRe.exec(sql))) sigs.push({ kind: "column", table: m[1], name: m[2] });

  const idxRe = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF NOT EXISTS\s+)?"?(\w+)"?\s+ON/gi;
  while ((m = idxRe.exec(sql))) sigs.push({ kind: "index", name: m[1] });

  const polRe = /CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:(\w+)\.)?"?(\w+)"?/gi;
  while ((m = polRe.exec(sql))) sigs.push({ kind: "policy", name: m[1], schema: m[2] || "public", table: m[3] });

  const seqRe = /CREATE SEQUENCE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi;
  while ((m = seqRe.exec(sql))) sigs.push({ kind: "sequence", name: m[1] });

  return sigs;
}

async function checkSignature(client, sig) {
  switch (sig.kind) {
    case "table":
      return (await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1", [sig.name])).rowCount > 0;
    case "type":
      return (await client.query("SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=$1", [sig.name])).rowCount > 0;
    case "function":
      return (await client.query("SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1", [sig.name])).rowCount > 0;
    case "column":
      return (await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2", [sig.table, sig.name])).rowCount > 0;
    case "index":
      return (await client.query("SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=$1", [sig.name])).rowCount > 0;
    case "policy":
      return (await client.query("SELECT 1 FROM pg_policies WHERE schemaname=$1 AND tablename=$2 AND policyname=$3", [sig.schema, sig.table, sig.name])).rowCount > 0;
    case "sequence":
      return (await client.query("SELECT 1 FROM information_schema.sequences WHERE sequence_schema='public' AND sequence_name=$1", [sig.name])).rowCount > 0;
  }
  return null;
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const remote = new Set(
    (await client.query("SELECT version FROM supabase_migrations.schema_migrations")).rows.map((r) => r.version)
  );

  const files = fs.readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
  const results = [];

  for (const f of files) {
    const version = f.split("_")[0];
    if (remote.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIG_DIR, f), "utf-8");
    const sigs = extractSignatures(sql);
    if (sigs.length === 0) {
      results.push({ file: f, version, status: "NO_SIGNATURE", detail: [] });
      continue;
    }
    let existCount = 0;
    const detail = [];
    for (const sig of sigs) {
      const exists = await checkSignature(client, sig);
      detail.push({ ...sig, exists });
      if (exists) existCount++;
    }
    let status;
    if (existCount === sigs.length) status = "APPLIED";
    else if (existCount === 0) status = "NOT_APPLIED";
    else status = "AMBIGUOUS";
    results.push({ file: f, version, status, detail });
  }

  await client.end();
  fs.writeFileSync(path.join(__dirname, "_migration_verify_report.json"), JSON.stringify(results, null, 2));

  const byStatus = {};
  for (const r of results) (byStatus[r.status] ||= []).push(r.file);
  for (const [status, list] of Object.entries(byStatus)) {
    console.log(`\n=== ${status} (${list.length}) ===`);
    list.forEach((f) => console.log(" -", f));
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
