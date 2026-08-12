const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const get = (k) => { const m = env.match(new RegExp(`^${k}\\s*=\\s*"?([^"\\n\\r]+)"?`, 'm')); return m ? m[1] : undefined; };
const SUPABASE_URL = get('SUPABASE_URL') || get('VITE_SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
  const { data: courses } = await admin.from('courses').select('id, title').eq('is_published', true).limit(1);
  const courseId = courses[0].id;
  console.log('Testing anonymous view of course:', courseId, courses[0].title);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const badResponses = [];
  page.on('response', async (res) => {
    if (res.url().includes('supabase') && res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Fully anonymous — no localStorage auth token set at all.
  await page.goto(`http://localhost:8080/course/${courseId}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(4000);

  const bodyText = await page.locator('body').innerText();
  console.log('Page shows course title?', bodyText.includes(courses[0].title));
  console.log('Page still shows loading skeleton only (bad)?', !bodyText.includes(courses[0].title) && bodyText.trim().length < 50);
  console.log('Bad Supabase responses:', badResponses.length ? badResponses : '(none)');
  console.log('Page errors:', pageErrors.length ? pageErrors : '(none)');

  await page.screenshot({ path: 'C:/Users/ADMINI~1/AppData/Local/Temp/claude/c--Users-Administrator-Documents-projects-course-connect/46de58ef-5457-445f-ab0b-7f0aedb1f341/scratchpad/anon_course_view.png', fullPage: true });

  await browser.close();
})();
