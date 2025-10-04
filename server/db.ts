/**
 * Database Configuration
 * 
 * Configures and exports the PostgreSQL database connection using Supabase.
 * Uses Drizzle ORM for type-safe database operations.
 * 
 * Environment Variables:
 * - DATABASE_URL: Required PostgreSQL connection string from Supabase
 * 
 * Important: Uses prepare: false for Supabase Transaction pooler compatibility
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

// Ensure database connection string is configured
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL client with Supabase-compatible settings
// IMPORTANT: prepare: false is required for Supabase Transaction pooler
export const client = postgres(process.env.DATABASE_URL, { 
  prepare: false // Required for Supabase Transaction pooler (port 6543)
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });
