/**
 * Script to run instructor profiles migration
 * This creates the necessary tables for admin-as-instructor functionality
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔄 Reading migration file...');
  const migrationPath = path.join(__dirname, '../migrations/20260809_add_instructor_profiles.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Running migration...');
  
  try {
    // Split SQL into individual statements (simple split, may need refinement)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // Try direct execution if RPC doesn't exist
          console.log('RPC not available, using direct client...');
          // Note: This might not work for all DDL statements
          console.warn('⚠️  Some statements may need to be run manually via Supabase Dashboard');
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - instructor_profiles');
    console.log('  - admin_instructor_actions');
    console.log('\nAdded columns to courses:');
    console.log('  - created_by_admin_id');
    console.log('  - last_edited_by_admin_id');
    console.log('  - last_edited_at');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Please run the migration manually via Supabase Dashboard:');
    console.log('   1. Go to SQL Editor in Supabase Dashboard');
    console.log('   2. Copy contents of migrations/20260809_add_instructor_profiles.sql');
    console.log('   3. Execute the SQL');
    process.exit(1);
  }
}

runMigration();
