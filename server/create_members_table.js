const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function createMembersTable() {
  try {
    console.log('Creating members table...');
    
    // Read and execute the SQL migration
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../supabase/migrations/20240411_create_members_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL using Supabase RPC or direct SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating table:', error);
      return false;
    }
    
    console.log('Members table created successfully!');
    console.log('Sample data inserted:', data);
    return true;
    
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
}

createMembersTable().then(success => {
  if (success) {
    console.log('Migration completed successfully');
    process.exit(0);
  } else {
    console.log('Migration failed');
    process.exit(1);
  }
});
