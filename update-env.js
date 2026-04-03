import fs from 'fs';
const envPath = '.env';
let content = fs.readFileSync(envPath, 'utf8');

const newDbUrl = 'postgresql://postgres.emvibxbcrvritkwkguya:bGFZ3850%23%24@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?options=project%3Demvibxbcrvritkwkguya';

content = content.replace(/DATABASE_URL=.*/, `DATABASE_URL="${newDbUrl}"`);

fs.writeFileSync(envPath, content);
console.log('.env updated successfully');
