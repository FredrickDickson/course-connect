-- Add Paystack authorization support and auto-renew opt-in
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paystack_authorization_code varchar,
  ADD COLUMN IF NOT EXISTS paystack_authorization_reusable boolean DEFAULT false;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;

-- Index for quick lookup of members opted into auto-renew
CREATE INDEX IF NOT EXISTS idx_members_auto_renew ON members (auto_renew);

-- Ensure renewal_history has payment_reference (already present in schema),
-- but add an index to simplify idempotency checks
CREATE INDEX IF NOT EXISTS idx_renewal_history_payment_reference ON renewal_history (payment_reference);
