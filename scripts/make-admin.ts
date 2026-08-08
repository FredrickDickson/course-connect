/**
 * Script to make a user an admin
 * Usage: tsx scripts/make-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function makeUserAdmin(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    // Get user from auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    const user = authData.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User with email ${email} not found. Please register first.`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update role in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update users table: ${updateError.message}`);
    }

    // Update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'admin',
        },
      }
    );

    if (metadataError) {
      throw new Error(`Failed to update user metadata: ${metadataError.message}`);
    }

    console.log('✅ Successfully made user an admin!');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log('🔑 Role: admin');
    console.log('\n✨ You can now login at: /login or /admin-setup');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Email to make admin
const EMAIL = 'sharifiddrisu205@gmail.com';

makeUserAdmin(EMAIL)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
