import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function checkSchema() {
  try {
    console.log('Checking columns in public.users:');
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users';
    `;
    console.log(JSON.stringify(cols, null, 2));
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await sql.end();
  }
}

checkSchema().catch(console.error);
