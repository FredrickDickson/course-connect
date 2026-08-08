# Make User Admin - Instructions

There are two ways to make `sharifiddrisu205@gmail.com` an admin:

## Option 1: Using Node.js Script (Recommended)

1. **Make sure you have the environment variables set up:**
   - Check that `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Run the script:**
   ```bash
   tsx scripts/make-admin.ts
   ```

3. **Login as admin:**
   - Go to: http://localhost:5173/login
   - Use email: `sharifiddrisu205@gmail.com`
   - Enter your password
   - You'll be redirected to the admin dashboard

## Option 2: Using Supabase SQL Editor

1. **Go to your Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Navigate to your project
   - Click on "SQL Editor" in the left sidebar

2. **Run the SQL script:**
   - Copy the contents of `make-admin.sql`
   - Paste it into the SQL Editor
   - Click "Run"

3. **Verify the change:**
   - You should see output showing the user is now an admin
   - Login at: http://localhost:5173/login

## Important Notes:

- ⚠️ The user **must already be registered** before running these scripts
- 🔐 If not registered yet, go to `/register` first and create an account
- ✅ After becoming admin, you can access:
  - `/admin` - Admin dashboard
  - `/admin-setup` - Admin setup page
  - `/admin/expedited` - Expedited reviews

## Troubleshooting:

**User not found?**
- Make sure the email is registered
- Check spelling of the email address
- Register at: http://localhost:5173/register

**Permission denied?**
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Check your `.env` file has the correct keys

**Still can't access admin?**
- Clear browser cache and cookies
- Sign out and sign in again
- Check browser console for errors
