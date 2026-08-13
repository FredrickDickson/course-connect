import 'dotenv/config';
import fs from "fs/promises";
import path from "path";
import { Client } from "pg";

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set in environment");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    const res = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (res.rowCount > 0) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf-8");
    console.log(`Applying migration: ${file}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [file]);
      await client.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed to apply ${file}:`, err);
      process.exit(1);
    }
  }

  await client.end();
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
