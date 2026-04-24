-- ============================================================================
-- Expedited routes P0: track support, payment lifecycle, pricing config,
-- supporting document storage bucket.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add track + payment columns to expedited_applications; widen status enum
-- ---------------------------------------------------------------------------

ALTER TABLE expedited_applications
  ADD COLUMN IF NOT EXISTS track TEXT
    NOT NULL DEFAULT 'ARBITRATION'
    CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Widen the status CHECK constraint to include draft + payment_pending.
-- We drop the old constraint (named by Postgres) and recreate it explicitly.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'expedited_applications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE expedited_applications DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE expedited_applications
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD CONSTRAINT expedited_applications_status_check
    CHECK (status IN ('draft', 'payment_pending', 'submitted', 'pending', 'under_review', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_expedited_applications_track
  ON expedited_applications(track);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_paystack_reference
  ON expedited_applications(paystack_reference);

COMMENT ON COLUMN expedited_applications.track IS
  'Pathway track: ARBITRATION or MEDIATION. Defaults to ARBITRATION for backwards compatibility.';
COMMENT ON COLUMN expedited_applications.paystack_reference IS
  'Paystack transaction reference used to reconcile payment with application.';
COMMENT ON COLUMN expedited_applications.paid_at IS
  'Timestamp when Paystack webhook confirmed charge.success for this application.';

-- ---------------------------------------------------------------------------
-- 2. Relax RLS policies so users can edit draft/payment_pending applications
--    and attach documents to not-yet-submitted applications.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own expedited applications" ON expedited_applications;
CREATE POLICY "Users can update own expedited applications"
  ON expedited_applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('draft', 'payment_pending', 'pending')
  );

DROP POLICY IF EXISTS "Users can insert own application documents" ON application_documents;
CREATE POLICY "Users can insert own application documents"
  ON application_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = application_documents.application_id
      AND expedited_applications.user_id = auth.uid()
      AND expedited_applications.status IN ('draft', 'payment_pending', 'pending')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Pricing config table (sku-based, track + level)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pricing_config (
  sku            TEXT PRIMARY KEY,
  track          TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level          TEXT NOT NULL CHECK (level IN ('MEMBER', 'FELLOW')),
  amount_minor   INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency       TEXT NOT NULL DEFAULT 'USD',
  description    TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_config_track_level_active_idx
  ON pricing_config(track, level)
  WHERE active;

DROP TRIGGER IF EXISTS update_pricing_config_updated_at ON pricing_config;
CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active prices (needed for client-side display & server reconciliation).
CREATE POLICY "pricing_config_public_read"
  ON pricing_config FOR SELECT
  USING (active = TRUE);

-- Only admins can modify pricing.
CREATE POLICY "pricing_config_admin_write"
  ON pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Seed placeholder prices (amounts in minor units, i.e. USD cents).
-- Admins can edit these later via the admin UI / SQL.
INSERT INTO pricing_config (sku, track, level, amount_minor, currency, description)
VALUES
  ('expedited_member_arb', 'ARBITRATION', 'MEMBER', 50000,  'USD', 'Expedited MCIMArb assessment fee'),
  ('expedited_fellow_arb', 'ARBITRATION', 'FELLOW', 100000, 'USD', 'Expedited FCIMArb assessment fee'),
  ('expedited_member_med', 'MEDIATION',   'MEMBER', 50000,  'USD', 'Expedited MCIMed assessment fee'),
  ('expedited_fellow_med', 'MEDIATION',   'FELLOW', 100000, 'USD', 'Expedited FCIMed assessment fee')
ON CONFLICT (sku) DO NOTHING;

COMMENT ON TABLE pricing_config IS
  'Configurable pricing for expedited application SKUs (track x level). Amounts stored in minor units.';

-- ---------------------------------------------------------------------------
-- 4. Storage bucket for expedited supporting documents
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expedited-documents',
  'expedited-documents',
  false,
  20971520, -- 20 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Users can upload into their own prefix: {userId}/{applicationId}/{filename}
CREATE POLICY "expedited_documents_user_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expedited-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own documents.
CREATE POLICY "expedited_documents_user_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expedited-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Users can delete their own documents (only while application is not yet submitted).
CREATE POLICY "expedited_documents_user_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expedited-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
