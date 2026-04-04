import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function applyMigrations() {
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260403220000_enable_rls_and_auth_trigger.sql');
    const queries = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying RLS and Auth Trigger...');
    await sql.unsafe(queries);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

applyMigrations();
