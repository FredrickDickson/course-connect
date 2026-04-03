import 'dotenv/config';
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    console.log('DB Host:', url.host);
    console.log('DB User:', url.username);
    console.log('DB Name:', url.pathname);
    console.log('DB Options:', url.search);
}
