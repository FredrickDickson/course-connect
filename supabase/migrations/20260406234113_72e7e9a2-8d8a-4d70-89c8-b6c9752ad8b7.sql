-- Add renewal tracking fields to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent date;

-- Create renewal history table
CREATE TABLE public.renewal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  renewal_date date NOT NULL DEFAULT CURRENT_DATE,
  new_expiry_date date NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  payment_method text NOT NULL DEFAULT 'paystack',
  payment_reference text,
  certificate_url text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own renewals"
  ON public.renewal_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = renewal_history.member_id
      AND members.user_id = (auth.uid())::text
  ));

CREATE POLICY "Admins can manage all renewals"
  ON public.renewal_history FOR ALL TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE INDEX idx_renewal_history_member ON public.renewal_history(member_id);
CREATE INDEX idx_members_status_lookup ON public.members(status);