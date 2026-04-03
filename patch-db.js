import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function fixSchema() {
  try {
    console.log('Adding password column to the users table...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`;
    console.log('Password column added successfully!');
  } catch (err) {
    console.error('Error modifying schema:', err);
  } finally {
    await sql.end();
  }
}

fixSchema();
