# Personal Notes Form - Database Setup Guide

## Issue
The personal notes form is returning a **500 Internal Server Error** because the `personal_notes_forms` table doesn't exist in your Supabase database.

## Solution: Run the Migration

### Option 1: Using Supabase Dashboard (Recommended - Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your CIMA Learn project

2. **Open SQL Editor**
   - Click: **SQL Editor** (left sidebar)
   - Click: **New Query**

3. **Copy and Paste the Migration SQL**
   - Copy the entire contents of: `migrations/20260901_create_personal_notes_forms.sql`
   - Paste into the SQL editor
   - Click: **Run** (or press Ctrl+Enter)

4. **Verify Success**
   - You should see: "Successfully executed" message
   - The table is now created with all necessary columns

### Option 2: Using CLI (If you have Supabase CLI installed)

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref emvibxbcrvritkwkguya

# Run migrations
supabase db push
```

### Option 3: Using Node.js Script

```bash
npm run migrate
```

## After Running Migration

### 1. Verify the Table Was Created
Go back to SQL Editor and run:

```sql
SELECT tablename 
FROM pg_tables 
WHERE tablename = 'personal_notes_forms';
```

Should return one row with `personal_notes_forms`.

### 2. Verify Storage Bucket
Run:

```sql
SELECT id, name, public
FROM storage.buckets 
WHERE id = 'personal-notes-forms';
```

Should return one row for the `personal-notes-forms` bucket.

### 3. Check RLS Policies
Run:

```sql
SELECT policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'personal_notes_forms';
```

Should show multiple policies for INSERT, SELECT, and UPDATE.

## What the Migration Creates

### Database Table: `personal_notes_forms`
- **Columns**: 60+ fields covering:
  - Personal information (name, age, gender, nationality)
  - Identification (Ghana Card, passport, voter ID, NHIS, TIN)
  - Contact details (phone, address)
  - Family information (parents, children)
  - Health data (blood group, medical conditions, vaccines)
  - Physical description (height, distinguishing marks, thumbprints)
  - Social media handles (Facebook, TikTok, Twitter)
  - Declaration (signature, date)
  - Admin fields (reviewed_at, reviewed_by, review_notes)

### Indexes
- `submitted_at DESC` - for quick sorting
- `reviewed_at` - for admin filtering
- `gender` - for statistics
- `region` - for statistics

### Row Level Security (RLS) Policies
- ✅ Public INSERT (anyone can submit forms)
- ✅ SELECT (for admins and users to view)
- ✅ UPDATE (for admin review/updates)

### Storage Bucket: `personal-notes-forms`
- File size limit: 10MB per file
- Allowed types: JPEG, PNG, PDF
- Used for: ID documents, thumbprints

## Environment Variables Check

Your current Supabase credentials:
```
VITE_SUPABASE_URL=https://emvibxbcrvritkwkguya.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<should be in .env>
```

**Verify these are set correctly in your `.env` file.**

## Testing the API After Migration

1. **Local Testing**
   ```bash
   npm run dev
   ```
   Then navigate to: http://localhost:8080/personal-notes-form

2. **Production Testing**
   - Push changes to GitHub
   - Wait for Vercel deployment (2-3 minutes)
   - Test at: https://cimalearn.thecima.org/personal-notes-form

3. **Try Submitting**
   - Fill in the form
   - Click "Submit Form"
   - Should now return success (if all fields are valid)

## Troubleshooting

### Still Getting 500 Error?

1. **Check if table exists**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'personal_notes_forms';
   ```

2. **Check database logs**
   - Supabase Dashboard → Database → Logs
   - Look for error messages

3. **Verify service role key**
   - Your API uses `SUPABASE_SERVICE_ROLE_KEY`
   - This must have write permission to the table
   - Go to Settings → API → Copy the service role key
   - Make sure it's in `.env` as `SUPABASE_SERVICE_ROLE_KEY`

4. **Check storage bucket permissions**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'personal-notes-forms';
   ```

### Getting Permission Denied Errors?

The RLS policies might be too restrictive. Run:

```sql
ALTER TABLE personal_notes_forms DISABLE ROW LEVEL SECURITY;
```

Then test again. If it works, the policies need adjustment.

## Next Steps

After the table is created:

1. ✅ Run the migration (create table)
2. ✅ Test form submission on localhost
3. ✅ Push to GitHub and wait for Vercel deployment
4. ✅ Test on production
5. ✅ Monitor form submissions at: `/admin-dashboard` (Personal Notes Forms tab)

## Support

If you still have issues:
1. Check Vercel deployment logs
2. Check Supabase database logs
3. Verify all environment variables are set
4. Make sure the service role key is valid and has permissions
