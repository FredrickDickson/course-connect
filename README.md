# CIMA Learn

An online learning platform (LMS) for a professional certification body, covering course delivery, enrollment & payments, and certification/renewal management.

## Features

- **Courses & curriculum** — instructors/admins build courses (Professional Programme or Adjunct Course) made up of modules, lessons, quizzes, and assignments.
- **Role-based dashboards** — dedicated experiences for learners, instructors, and admins.
- **Enrollment & payments** — checkout and order management powered by Paystack.
- **Certification & renewal** — certificates of completion, membership renewals, expedited applications, and qualification pathways.
- **Video & live classes** — Mux-hosted video lessons and Zoom-powered live sessions.
- **Downloadable resources** — PDF course materials.
- **Community** — forums, posts, and notifications.
- **Automation** — n8n workflows and Resend-powered transactional email for enrollment/renewal/certificate notifications.

## Tech stack

- **Client**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, wouter
- **Server**: Express (TypeScript), run with `tsx`/`nodemon` in dev, bundled with esbuild for production
- **Database**: Supabase (Postgres), with SQL migrations and Edge Functions
- **Testing**: Vitest (unit) and Playwright (e2e)

## Project structure

| Path | Description |
| --- | --- |
| `client/` | React SPA source (`@` path alias → `client/src`) |
| `server/` | Express API |
| `shared/` | Schema/types shared between client and server (`@shared` path alias) |
| `supabase/` | Postgres migrations and Supabase Edge Functions |
| `api/` | Vercel serverless functions |
| `e2e/` | Playwright end-to-end test suite |
| `migrations/` | Raw SQL migrations |
| `scripts/` | CLI/admin utilities (seeding, env checks, etc.) |
| `n8n/` | Automation workflow definitions |
| `docs/` | Additional documentation |

## Getting started

**Prerequisites**: Node.js, and a Supabase project (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for setting up the database).

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# then fill in the values — see "Environment variables" below

# Start the dev server
npm run dev
```

## Environment variables

Copy `.env.example` (or one of `.env.local.example` / `.env.preview.example` / `.env.production.example`) and fill in real values. Variables are grouped into:

- Supabase (URL, anon key, service role key) and `DATABASE_URL`
- App/session config (`NODE_ENV`, `SESSION_SECRET`, `FRONTEND_URL`, `VITE_APP_URL`, `CLIENT_URL`)
- Paystack (payment gateway)
- Resend (transactional email) and internal/certificate API keys
- Mux (video streaming)
- Zoom (live classes)
- Google Cloud Storage (file uploads)
- n8n (workflow webhooks)
- Currency conversion rate and Playwright e2e test user credentials

See `.env.example` for the full, up-to-date list — never commit real secrets.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the server in watch mode (dev) |
| `npm run build` | Validate env, build the client, and bundle the server for production |
| `npm run build:dev` | Build the client only |
| `npm start` | Run the production build (`dist/index.js`) |
| `npm run check` | Type-check with `tsc` |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:ui` / `:headed` / `:debug` / `:report` | Playwright variants and report viewer |
| `npm run test:e2e:seed` | Seed test data for e2e runs |
| `npm run env:check` | Validate required environment variables |
| `npm run env:local` / `:preview` / `:production` | Copy the matching env example file |

## Testing

- Unit tests: `npm test` (Vitest)
- End-to-end tests: `npm run test:e2e` (Playwright) — see [e2e/README.md](e2e/README.md) for the full suite layout and seeding steps.

## Further documentation

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — database setup
- [ADMIN_COURSE_CREATION_GUIDE.md](ADMIN_COURSE_CREATION_GUIDE.md) — creating courses as an admin
- [docs/mux/README.md](docs/mux/README.md) — Mux video integration
- [e2e/README.md](e2e/README.md) — end-to-end test suite
- [n8n/README.md](n8n/README.md) — automation workflows
- [email-templates/README.md](email-templates/README.md) — transactional email templates

## License

MIT — see [LICENSE](LICENSE).
