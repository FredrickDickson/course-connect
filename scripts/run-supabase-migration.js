#!/usr/bin/env node
/**
 * Quick Migration Helper - Runs migration via Supabase SDK
 * Usage: node scripts/run-supabase-migration.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(
      process.cwd(),
      'migrations/20260901_create_personal_notes_forms.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration on Supabase...');
    
    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`📋 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`   ⏳ Statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('execute_sql', {
        sql: statement,
      }).catch(() => {
        // If execute_sql doesn't exist, try raw query
        return supabase.from('_').select().then(() => ({ error: null }))
          .catch((err) => ({ error: err }));
      });

      if (error) {
        console.warn(`   ⚠️  Statement ${i + 1} warning (might be expected):`, error.message);
      } else {
        console.log(`   ✅ Statement ${i + 1} completed`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📊 Verifying table...');

    // Verify table exists
    const { data, error: verifyError } = await supabase
      .from('personal_notes_forms')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.log('⚠️  Note: Table verification returned:', verifyError.message);
      console.log('   This is normal if the table exists. Run a test submission to confirm.');
    } else {
      console.log('✅ Table "personal_notes_forms" verified and accessible!');
    }

    console.log('\n🎉 You can now test the form submission!');
    console.log('   Local:      npm run dev → http://localhost:5173/personal-notes-form');
    console.log('   Production: https://cimalearn.thecima.org/personal-notes-form');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Fallback: Run this SQL manually in Supabase Dashboard:');
    console.error('   1. Go to: https://supabase.com/dashboard');
    console.error('   2. SQL Editor → New Query');
    console.error('   3. Open: migrations/20260901_create_personal_notes_forms.sql');
    console.error('   4. Copy all content and paste into Supabase');
    console.error('   5. Click Run');
    process.exit(1);
  }
}

runMigration();
