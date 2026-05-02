-- Membership Subscription Table for Annual Renewal Fees
-- Pricing: GBP £46.00, USD $61.00, GHS ₵660.00

CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL DEFAULT 'ARBITRATION' CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level TEXT NOT NULL CHECK (level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  amount_gbp NUMERIC(10,2) NOT NULL DEFAULT 46.00,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 61.00,
  amount_ghs NUMERIC(10,2) NOT NULL DEFAULT 660.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
  paystack_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, track, level, end_date)
);

CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_user_id ON membership_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_end_date ON membership_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_status ON membership_subscriptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_track_level ON membership_subscriptions(track, level);

-- Enable RLS
ALTER TABLE membership_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON membership_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON membership_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON membership_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON membership_subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ));

-- Updated at trigger
CREATE TRIGGER update_membership_subscriptions_updated_at
  BEFORE UPDATE ON membership_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE membership_subscriptions IS 'Annual membership renewal subscriptions with multi-currency pricing';
