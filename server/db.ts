/**
 * Database Configuration
 * 
 * Configures and exports the PostgreSQL database connection using Neon serverless.
 * Uses Drizzle ORM for type-safe database operations.
 * 
 * Environment Variables:
 * - DATABASE_URL: Required PostgreSQL connection string from Neon
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless connection
neonConfig.webSocketConstructor = ws;

// Ensure database connection string is configured
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool and Drizzle ORM instance
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });