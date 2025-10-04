# Supabase Database Setup Guide

This guide will help you connect your CIMA Learning Platform to Supabase and set up the database schema.

## Step 1: Get Your Supabase Connection String

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Click on **"Connect"** button in the top right
4. Under **"Connection string"**, select **"Transaction pooler"** (recommended for serverless)
5. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 2: Update Environment Variables

Add your Supabase connection string to your `.env` file or Replit Secrets:

```bash
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important Notes:**
- Use **Transaction pooler** (port 6543) for best performance with Replit
- The code is already configured with `prepare: false` for Supabase compatibility

## Step 3: Run the SQL Migration

You have two options to create the database tables:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Copy and paste the entire contents of `migrations/0000_colossal_tomorrow_man.sql`
5. Click **"Run"** to execute the migration

### Option B: Using Drizzle Push (Automatic)

Run this command in the Replit Shell:

```bash
npx drizzle-kit push
```

This will automatically create all tables in your Supabase database.

## Step 4: Verify the Setup

1. Go to **"Table Editor"** in your Supabase Dashboard
2. You should see 23 tables created:
   - `users`
   - `courses`
   - `modules`
   - `lessons`
   - `enrollments`
   - `progress`
   - `reviews`
   - `discussions`
   - `replies`
   - `certifications`
   - `orders`
   - `categories`
   - `quizzes`
   - `quiz_questions`
   - `quiz_answers`
   - `quiz_attempts`
   - `quiz_responses`
   - `assignments`
   - `assignment_submissions`
   - `instructor_payouts`
   - `instructor_applications`
   - `favorites`
   - `sessions`

## Step 5: Restart Your Application

Your application is now connected to Supabase! The database connection has been updated to use:
- `postgres` package (instead of `@neondatabase/serverless`)
- Transaction pooler compatible settings

## Database Schema Overview

The platform includes:

**Core Tables:**
- **users**: User profiles and authentication
- **courses**: Course catalog with pricing
- **modules & lessons**: Hierarchical course content
- **enrollments**: Student course registrations
- **progress**: Learning progress tracking

**Community Features:**
- **discussions**: Course forums
- **replies**: Discussion responses
- **reviews**: Course ratings and feedback

**Assessments:**
- **quizzes**: Quiz metadata
- **quiz_questions**: Quiz questions
- **quiz_answers**: Answer options
- **quiz_attempts**: Student quiz attempts
- **quiz_responses**: Individual answers
- **assignments**: Assignment tasks
- **assignment_submissions**: Student submissions

**Business:**
- **orders**: Payment transactions (Paystack)
- **certifications**: Course certificates
- **instructor_payouts**: Instructor earnings
- **instructor_applications**: Instructor onboarding

**System:**
- **sessions**: User authentication sessions
- **categories**: Course categories
- **favorites**: Saved courses

## Troubleshooting

### Connection Error
- Verify your `DATABASE_URL` is correct
- Ensure you're using the Transaction pooler (port 6543)
- Check that your Supabase project is active

### Tables Not Created
- Run the SQL migration again in Supabase SQL Editor
- Verify you have permissions to create tables
- Check for error messages in the SQL Editor

### Authentication Issues
- Make sure the `sessions` table exists
- Verify `SESSION_SECRET` is set in your environment variables

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
