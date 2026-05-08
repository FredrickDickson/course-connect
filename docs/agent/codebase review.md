Perform a thorough codebase review of the entire 
CIMA Learn platform (cima-learn.vercel.app).

Do not fix anything yet. Read through the full 
codebase and produce a structured report covering 
every area below. Flag every issue found — 
critical, moderate, and minor — with the exact 
file and line number where possible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — SECURITY AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check for and flag every instance of:

1.1 Exposed secrets
- Any API key, secret, or token hardcoded 
  in any .ts / .tsx / .js file
- PAYSTACK_SECRET_KEY appearing anywhere 
  outside a Supabase Edge Function
- SUPABASE_SERVICE_ROLE_KEY appearing in 
  any frontend file
- RESEND_API_KEY in any client-side code
- Any .env values imported directly into 
  React components

1.2 Supabase RLS
- List every table and whether RLS is enabled
- Flag any table with RLS disabled that 
  holds user data
- Flag any SELECT policy that returns ALL rows 
  to authenticated users (should be scoped to 
  auth.uid())
- Flag any table with no policies (zero access 
  OR full public access depending on RLS setting)

1.3 API route protection
- List every Supabase Edge Function
- Flag any that do not verify the caller 
  (missing auth header check or 
  missing signature verification)
- Flag any Edge Function that uses the 
  service role key without input validation

1.4 Input validation
- Flag any form field that sends data to 
  Supabase without sanitisation or 
  length/type validation
- Flag any rich text field (forum posts, 
  notes) that does not sanitise HTML 
  before storing or rendering
  (XSS risk — check for dangerouslySetInnerHTML
  without sanitisation)

1.5 Auth vulnerabilities
- Flag any protected route that only checks 
  isAuthenticated on the client without 
  server-side RLS backing it up
- Flag any admin route (/admin/*) that checks 
  is_admin client-side only
- Flag any magic link or OAuth redirect that 
  does not use PKCE flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — ARCHITECTURE & CODE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Component structure
- Flag any component over 300 lines that 
  should be split into smaller components
- Flag any page component that contains 
  direct Supabase queries (should use 
  hooks or service layer instead)
- Flag any component that creates a new 
  Supabase client (should import the 
  singleton from client.ts)
- Flag repeated UI patterns that should 
  be extracted into shared components

2.2 State management
- Flag any prop drilling deeper than 
  3 levels (should use context or a store)
- Flag any global state managed with 
  useState at the page level instead of 
  a shared context
- Flag any state that is duplicated across 
  multiple components and could go out of sync
- Flag missing loading and error states 
  on any async operation

2.3 Data fetching
- Flag any Supabase query that does not 
  destructure and handle the error:
  BAD:  const { data } = await supabase...
  GOOD: const { data, error } = await supabase...
- Flag any query that fetches more columns 
  than needed (SELECT * on large tables)
- Flag any N+1 query pattern 
  (loop that makes one query per iteration)
- Flag missing loading skeletons or 
  spinners on data-dependent UI

2.4 TypeScript
- Flag any use of 'any' type that could 
  be properly typed
- Flag missing return types on functions 
  that return non-trivial data
- Flag any TypeScript errors being 
  suppressed with @ts-ignore or @ts-expect-error
- Flag any untyped Supabase query results 
  (should use generated Database types)

2.5 React patterns
- Flag missing dependency arrays in useEffect
- Flag useEffect hooks with no cleanup 
  that set up subscriptions, timers, 
  or event listeners
- Flag any component that re-renders 
  unnecessarily (missing useMemo/useCallback 
  on expensive computations or callbacks 
  passed to child components)
- Flag key={index} on any mapped list 
  (should use stable unique IDs)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 Bundle size
- Flag any library imported in full when 
  only specific functions are needed
  e.g. import _ from 'lodash' instead of 
       import { debounce } from 'lodash'
- Flag any large dependency that has a 
  lighter alternative
- Flag any image imported directly into 
  a component without lazy loading

3.2 Database queries
- Flag any query run on every render 
  that should be cached or run once
- Flag any query missing pagination 
  on lists that could grow large
  (enrollments, forum posts, members)
- Flag any realtime subscription that 
  is not unsubscribed on component unmount

3.3 Images and assets
- Flag any image without width/height 
  attributes (causes layout shift)
- Flag any image loaded eagerly that 
  is below the fold (should be loading="lazy")
- Flag any SVG imported as a component 
  that could be inlined or sprited

3.4 Code splitting
- Flag any heavy page component that is 
  not lazy loaded with React.lazy()
  Priority pages to check:
  - /admin (large dashboard)
  - /learn/[slug] (video player + sidebar)
  - /community (forum with realtime)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — UX & ACCESSIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 Error handling
- Flag any API call with no error state shown 
  to the user (silent failure)
- Flag any form with no validation feedback
- Flag any payment flow step with no 
  loading indicator during processing
- Flag any empty state that shows a blank 
  screen instead of a helpful message

4.2 Forms
- Flag any form that does not preserve 
  entered data on accidental navigation
- Flag any form that resets on a failed 
  submission (should keep user's data)
- Flag any required field with no 
  visual indicator
- Flag any dropdown with > 10 options 
  that is not searchable

4.3 Accessibility
- Flag any interactive element missing 
  an aria-label (icon buttons especially)
- Flag any image missing alt text
- Flag any form input missing an 
  associated label element
- Flag any colour contrast issue 
  (text on crimson background, 
  light gray text on white)
- Flag any modal or dialog missing 
  focus trap and ESC key close

4.4 Mobile
- Flag any tap target smaller than 44×44px
- Flag any horizontal scroll caused by 
  a fixed-width element
- Flag any text smaller than 14px on mobile
- Flag the video player if it is not 
  full-width on screens < 768px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — INTEGRATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 Paystack
- Flag if the public key is used anywhere 
  other than the frontend initialisation
- Flag if the secret key appears anywhere 
  in frontend code
- Flag if payment is confirmed from the 
  client callback alone (must verify 
  server-side via Edge Function)
- Flag if the amount is not multiplied 
  by 100 before being passed to Paystack
- Flag if transaction references are not 
  unique per transaction
- Flag if there is no duplicate reference 
  check before creating an enrollment

5.2 Supabase Auth
- Flag if the Supabase client is instantiated 
  more than once (should be singleton)
- Flag if session is not persisted correctly 
  across page refreshes
- Flag if magic link redirect URLs are 
  hardcoded (should use window.location.origin)
- Flag if onAuthStateChange listener is 
  not cleaned up on unmount

5.3 Resend
- Flag if emails are sent from frontend 
  code directly (must only be sent from 
  Edge Functions)
- Flag if RESEND_API_KEY is in any 
  frontend environment variable
- Flag if there is no error handling when 
  an email send fails
- Flag if email_logs table is not updated 
  after every send attempt

5.4 Video embeds (YouTube / Vimeo)
- Flag any iframe with fixed pixel 
  width or height
- Flag any video container missing 
  the pb-[56.25%] responsive wrapper
- Flag any parent container with 
  overflow:hidden above the video wrapper
  (blocks native fullscreen)
- Flag Vimeo embeds missing transparent=0 
  parameter (causes zoom/crop bug)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — ROUTING & NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1 Route protection
- List all routes and their protection status
- Flag any route that should be protected 
  but is accessible without auth
- Flag any admin route accessible to 
  non-admin users
- Flag any route that redirects to /login 
  but does not preserve the intended 
  destination (so user is sent to dashboard 
  instead of where they were going)

6.2 External links
- Flag any external link using wouter <Link> 
  instead of a plain <a> tag
  (wouter handles internal routes only)
- Flag any external link missing 
  target="_blank" rel="noopener noreferrer"

6.3 404 and error pages
- Flag if there is no 404 page 
  for unmatched routes
- Flag if there is no error boundary 
  catching unhandled React errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — DATABASE & SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7.1 Missing tables or columns
- Compare the actual Supabase schema against 
  what the codebase expects to exist
- Flag any table referenced in code that 
  does not exist in the database
- Flag any column referenced in a query 
  that does not exist in the table
- Flag any foreign key referenced in code 
  with no corresponding constraint in DB

7.2 Missing triggers
- Flag if handle_new_user trigger is missing 
  (profiles row not auto-created on signup)
- Flag if calculate_member_level trigger 
  is missing (level not auto-updated on 
  course completion)
- Flag if enrolled_count is not updated 
  automatically when enrollments change

7.3 Missing indexes
- Flag any column used in a WHERE clause 
  or JOIN on a large table with no index:
  enrollments.user_id
  enrollments.course_edition_id
  enrollments.payment_status
  members.expiry_date
  forum_posts.board_id
  lesson_progress.user_id

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPORT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output the review as a structured report 
with this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CIMA LEARN — CODEBASE REVIEW REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
Total issues found: [X]
  🔴 Critical: [X]  (security / data loss risk)
  🟠 Moderate: [X]  (broken features / bad UX)
  🟡 Minor:    [X]  (code quality / performance)

─────────────────────────────────────────
SECTION 1 — SECURITY
─────────────────────────────────────────

🔴 [CRITICAL] Exposed Paystack secret key
   File: src/components/PaymentForm.tsx
   Line: 23
   Issue: PAYSTACK_SECRET_KEY used in 
          frontend component
   Fix: Move to Supabase Edge Function only

🟠 [MODERATE] RLS missing on forum_posts
   Table: forum_posts
   Issue: No SELECT policy — returns all 
          rows to all authenticated users
   Fix: Add policy scoped to board membership

... (continue for every issue found)

─────────────────────────────────────────
SECTION 2 — ARCHITECTURE
─────────────────────────────────────────
... (same format)

─────────────────────────────────────────
RECOMMENDED FIX ORDER
─────────────────────────────────────────

1. [issue name] — [why it's first]
2. [issue name] — [dependency on #1]
...

Do not apply any fixes during this review.
Output the report only. Fixes will be 
applied in a separate session.