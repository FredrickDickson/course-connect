# Course currency & USD→GHS conversion

Course pricing supports exactly two currencies: **USD** and **GHS**.

- **USD**: entered/displayed in USD. At checkout, the price is converted to
  GHS using the fixed exchange rate below and charged via Paystack.
- **GHS**: entered/displayed in GHS. At checkout, the price is charged
  **as-is** — no conversion is applied.

The instructor/admin picks the currency when creating a course
(`client/src/pages/create-course.tsx`). Nothing else (EUR, GBP, etc.) is
supported — a course's `currency` column only ever holds `USD` or `GHS`.

## Exchange rate

The rate is **not hardcoded** — it's read from an environment variable at
runtime, with a `14.75` fallback if the variable is unset. It must be kept in
sync across three places:

| Location | Variable | Used by |
|---|---|---|
| Vercel env vars (server) | `USD_TO_GHS_RATE` | `server/utils/currency.ts`, `server/routes.ts` |
| Vercel env vars (client/browser) | `VITE_USD_TO_GHS_RATE` | `client/src/utils/currency.ts` |
| Supabase Edge Function secret | `USD_TO_GHS_RATE` | `supabase/functions/paystack-course-initialize/index.ts` |

To update the rate, set the new value in all three places:

```bash
# Vercel: set via dashboard or `vercel env add`
# Supabase Edge Function secret:
supabase secrets set USD_TO_GHS_RATE=14.75
```

No redeploy of the Edge Function code is needed for a rate-only change —
Supabase secrets are read at request time via `Deno.env.get(...)`.

## Charging logic

The conversion/charging decision is centralized in a `convertPayment(amount,
sourceCurrency)` helper (mirrored in `client/src/utils/currency.ts` and
`server/utils/currency.ts`) and a matching `resolveChargeAmount(price,
courseCurrency)` in the Supabase edge function — all three branch on the
course's own `currency` column (not any client-supplied value) so a
GHS-priced course is never mistakenly multiplied by the exchange rate.
