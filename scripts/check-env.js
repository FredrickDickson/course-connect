#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script checks if all required environment variables are set
 * for the current environment (development, preview, or production).
 */

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY', 
  'VITE_SUPABASE_PROJECT_ID',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'SESSION_SECRET',
  'PAYSTACK_SECRET_KEY',
  'VITE_PAYSTACK_PUBLIC_KEY',
  'FRONTEND_URL'
];

const optionalVars = [
  'BREVO_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'INTERNAL_API_KEY',
  'CRON_SECRET_KEY',
  'GOOGLE_CLOUD_STORAGE_BUCKET'
];

function checkEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`🔍 Checking environment: ${nodeEnv}`);
  console.log('=====================================');

  let missingRequired = [];
  let missingOptional = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  });

  // Check optional variables
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });

  // Report results
  if (missingRequired.length === 0) {
    console.log('✅ All required environment variables are set!');
  } else {
    console.log('❌ Missing required environment variables:');
    missingRequired.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (missingOptional.length > 0) {
    console.log('\n⚠️  Missing optional environment variables:');
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  // Environment-specific checks
  console.log('\n🔧 Environment-specific configuration:');
  
  if (nodeEnv === 'development') {
    const isLocal = process.env.VITE_APP_URL?.includes('localhost') || process.env.VITE_DEBUG_MODE === 'true';
    console.log(`   Local development: ${isLocal ? '✅' : '❌'}`);
    console.log(`   Debug mode: ${process.env.VITE_DEBUG_MODE === 'true' ? '✅' : '❌'}`);
    console.log(`   Mock payments: ${process.env.VITE_ENABLE_MOCK_PAYMENTS === 'true' ? '✅' : '❌'}`);
  } else if (nodeEnv === 'preview') {
    const isPreview = process.env.VITE_APP_URL?.includes('vercel.app');
    console.log(`   Preview URL: ${isPreview ? '✅' : '❌'}`);
    console.log(`   Debug mode: ${process.env.VITE_DEBUG_MODE === 'true' ? '✅' : '❌'}`);
  } else if (nodeEnv === 'production') {
    const isProd = !process.env.VITE_APP_URL?.includes('localhost') && !process.env.VITE_APP_URL?.includes('vercel.app');
    console.log(`   Production URL: ${isProd ? '✅' : '❌'}`);
    console.log(`   Debug mode disabled: ${process.env.VITE_DEBUG_MODE !== 'true' ? '✅' : '❌'}`);
    console.log(`   Live payments: ${process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live') ? '✅' : '❌'}`);
  }

  // Exit with error if required variables are missing
  // Skip validation if SKIP_ENV_VALIDATION is set (for CI/CD)
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.log('\n⚠️  Environment validation skipped (CI/CD mode)');
    console.log('   Make sure environment variables are set in your deployment platform!');
    process.exit(0);
  }

  if (missingRequired.length > 0) {
    console.log('\n❌ Environment check failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Environment check passed!');
    process.exit(0);
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Run the check
checkEnvironment();
