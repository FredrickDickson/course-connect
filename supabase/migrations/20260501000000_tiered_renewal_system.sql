-- Tiered Membership Renewal System
-- Implements World Bank income classification-based pricing
-- High-Income: £65 GBP / $85 USD
-- Lower-Middle-Income: £46 GBP / $61 USD / ₵660 GHS

-- ============================================================================
-- 1. Country Classifications Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS country_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2
  country_name VARCHAR(100) NOT NULL,
  income_tier VARCHAR(50) NOT NULL CHECK (income_tier IN ('HIGH_INCOME', 'LOWER_MIDDLE_INCOME')),
  region VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_country_classifications_code ON country_classifications(country_code);
CREATE INDEX IF NOT EXISTS idx_country_classifications_tier ON country_classifications(income_tier);

-- ============================================================================
-- 2. Organizations Table (for group/institutional renewals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(50),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  discount_tier VARCHAR(20) DEFAULT 'NONE' CHECK (discount_tier IN ('NONE', '10_PERCENT', '15_PERCENT')),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_discount ON organizations(discount_tier);

-- ============================================================================
-- 3. Renewal Pricing Configuration Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS renewal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_tier VARCHAR(50) NOT NULL CHECK (income_tier IN ('HIGH_INCOME', 'LOWER_MIDDLE_INCOME')),
  membership_level VARCHAR(20) NOT NULL CHECK (membership_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('GBP', 'USD', 'GHS')),
  base_amount DECIMAL(10,2) NOT NULL,
  late_surcharge_percentage DECIMAL(5,2) DEFAULT 15.00,
  effective_from DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(income_tier, membership_level, currency, effective_from)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_renewal_pricing_tier ON renewal_pricing(income_tier);
CREATE INDEX IF NOT EXISTS idx_renewal_pricing_level ON renewal_pricing(membership_level);
CREATE INDEX IF NOT EXISTS idx_renewal_pricing_active ON renewal_pricing(is_active);

-- ============================================================================
-- 4. Update members table with renewal tracking
-- ============================================================================
ALTER TABLE members
ADD COLUMN IF NOT EXISTS income_tier VARCHAR(50) CHECK (income_tier IN ('HIGH_INCOME', 'LOWER_MIDDLE_INCOME')),
ADD COLUMN IF NOT EXISTS renewal_anniversary DATE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_date DATE,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_members_income_tier ON members(income_tier);
CREATE INDEX IF NOT EXISTS idx_members_anniversary ON members(renewal_anniversary);
CREATE INDEX IF NOT EXISTS idx_members_suspended ON members(is_suspended);
CREATE INDEX IF NOT EXISTS idx_members_organization ON members(organization_id);

-- ============================================================================
-- 5. Update renewal_history table with tier information
-- ============================================================================
ALTER TABLE renewal_history
ADD COLUMN IF NOT EXISTS income_tier VARCHAR(50),
ADD COLUMN IF NOT EXISTS currency_used VARCHAR(3),
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS surcharge_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_renewal_history_tier ON renewal_history(income_tier);
CREATE INDEX IF NOT EXISTS idx_renewal_history_late ON renewal_history(is_late);
CREATE INDEX IF NOT EXISTS idx_renewal_history_org ON renewal_history(organization_id);

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================
ALTER TABLE country_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_pricing ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies
-- ============================================================================

-- country_classifications - public read, service role write
CREATE POLICY "Public can read country_classifications"
  ON country_classifications FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage country_classifications"
  ON country_classifications FOR ALL
  USING (auth.role() = 'service_role');

-- organizations - users can read own org, admins can manage all
CREATE POLICY "Users can read own organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.organization_id = organizations.id
        AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- renewal_pricing - public read, service role write
CREATE POLICY "Public can read renewal_pricing"
  ON renewal_pricing FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage renewal_pricing"
  ON renewal_pricing FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. Updated at trigger for organizations
-- ============================================================================
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Updated at trigger for renewal_pricing
-- ============================================================================
CREATE TRIGGER update_renewal_pricing_updated_at
  BEFORE UPDATE ON renewal_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. Seed initial pricing configuration
-- ============================================================================
INSERT INTO renewal_pricing (income_tier, membership_level, currency, base_amount, late_surcharge_percentage, effective_from, is_active)
VALUES
  -- High-Income Jurisdictions
  ('HIGH_INCOME', 'ASSOCIATE', 'GBP', 65.00, 15.00, '2026-05-01', true),
  ('HIGH_INCOME', 'ASSOCIATE', 'USD', 85.00, 15.00, '2026-05-01', true),
  ('HIGH_INCOME', 'MEMBER', 'GBP', 65.00, 15.00, '2026-05-01', true),
  ('HIGH_INCOME', 'MEMBER', 'USD', 85.00, 15.00, '2026-05-01', true),
  ('HIGH_INCOME', 'FELLOW', 'GBP', 65.00, 15.00, '2026-05-01', true),
  ('HIGH_INCOME', 'FELLOW', 'USD', 85.00, 15.00, '2026-05-01', true),
  -- Lower-Middle-Income Jurisdictions
  ('LOWER_MIDDLE_INCOME', 'ASSOCIATE', 'GBP', 46.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'ASSOCIATE', 'USD', 61.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'ASSOCIATE', 'GHS', 660.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'MEMBER', 'GBP', 46.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'MEMBER', 'USD', 61.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'MEMBER', 'GHS', 660.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'FELLOW', 'GBP', 46.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'FELLOW', 'USD', 61.00, 15.00, '2026-05-01', true),
  ('LOWER_MIDDLE_INCOME', 'FELLOW', 'GHS', 660.00, 15.00, '2026-05-01', true)
ON CONFLICT (income_tier, membership_level, currency, effective_from) DO NOTHING;

-- ============================================================================
-- 11. Seed country classifications (World Bank income classifications)
-- ============================================================================
INSERT INTO country_classifications (country_code, country_name, income_tier, region)
VALUES
  -- High-Income Countries
  ('US', 'United States', 'HIGH_INCOME', 'North America'),
  ('CA', 'Canada', 'HIGH_INCOME', 'North America'),
  ('GB', 'United Kingdom', 'HIGH_INCOME', 'Europe'),
  ('IE', 'Ireland', 'HIGH_INCOME', 'Europe'),
  ('DE', 'Germany', 'HIGH_INCOME', 'Europe'),
  ('FR', 'France', 'HIGH_INCOME', 'Europe'),
  ('NL', 'Netherlands', 'HIGH_INCOME', 'Europe'),
  ('BE', 'Belgium', 'HIGH_INCOME', 'Europe'),
  ('LU', 'Luxembourg', 'HIGH_INCOME', 'Europe'),
  ('CH', 'Switzerland', 'HIGH_INCOME', 'Europe'),
  ('AT', 'Austria', 'HIGH_INCOME', 'Europe'),
  ('IT', 'Italy', 'HIGH_INCOME', 'Europe'),
  ('ES', 'Spain', 'HIGH_INCOME', 'Europe'),
  ('PT', 'Portugal', 'HIGH_INCOME', 'Europe'),
  ('DK', 'Denmark', 'HIGH_INCOME', 'Europe'),
  ('SE', 'Sweden', 'HIGH_INCOME', 'Europe'),
  ('NO', 'Norway', 'HIGH_INCOME', 'Europe'),
  ('FI', 'Finland', 'HIGH_INCOME', 'Europe'),
  ('IS', 'Iceland', 'HIGH_INCOME', 'Europe'),
  ('PL', 'Poland', 'HIGH_INCOME', 'Europe'),
  ('CZ', 'Czech Republic', 'HIGH_INCOME', 'Europe'),
  ('SK', 'Slovakia', 'HIGH_INCOME', 'Europe'),
  ('SI', 'Slovenia', 'HIGH_INCOME', 'Europe'),
  ('EE', 'Estonia', 'HIGH_INCOME', 'Europe'),
  ('LV', 'Latvia', 'HIGH_INCOME', 'Europe'),
  ('LT', 'Lithuania', 'HIGH_INCOME', 'Europe'),
  ('GR', 'Greece', 'HIGH_INCOME', 'Europe'),
  ('CY', 'Cyprus', 'HIGH_INCOME', 'Europe'),
  ('MT', 'Malta', 'HIGH_INCOME', 'Europe'),
  ('AE', 'United Arab Emirates', 'HIGH_INCOME', 'Middle East'),
  ('QA', 'Qatar', 'HIGH_INCOME', 'Middle East'),
  ('KW', 'Kuwait', 'HIGH_INCOME', 'Middle East'),
  ('SA', 'Saudi Arabia', 'HIGH_INCOME', 'Middle East'),
  ('IL', 'Israel', 'HIGH_INCOME', 'Middle East'),
  ('BH', 'Bahrain', 'HIGH_INCOME', 'Middle East'),
  ('OM', 'Oman', 'HIGH_INCOME', 'Middle East'),
  ('SG', 'Singapore', 'HIGH_INCOME', 'Asia-Pacific'),
  ('JP', 'Japan', 'HIGH_INCOME', 'Asia-Pacific'),
  ('KR', 'South Korea', 'HIGH_INCOME', 'Asia-Pacific'),
  ('AU', 'Australia', 'HIGH_INCOME', 'Asia-Pacific'),
  ('NZ', 'New Zealand', 'HIGH_INCOME', 'Asia-Pacific'),
  ('HK', 'Hong Kong', 'HIGH_INCOME', 'Asia-Pacific'),
  ('TW', 'Taiwan', 'HIGH_INCOME', 'Asia-Pacific'),
  -- Lower-Middle-Income Countries (Africa)
  ('GH', 'Ghana', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('NG', 'Nigeria', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('KE', 'Kenya', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('ZA', 'South Africa', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('EG', 'Egypt', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('MA', 'Morocco', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('DZ', 'Algeria', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('TN', 'Tunisia', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('ET', 'Ethiopia', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('UG', 'Uganda', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('TZ', 'Tanzania', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('ZM', 'Zambia', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('ZW', 'Zimbabwe', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('MW', 'Malawi', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('MZ', 'Mozambique', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('BW', 'Botswana', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('NA', 'Namibia', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('RW', 'Rwanda', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('SN', 'Senegal', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('CI', 'Ivory Coast', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('CM', 'Cameroon', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('NE', 'Niger', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('TD', 'Chad', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('CF', 'Central African Republic', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('BI', 'Burundi', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('SS', 'South Sudan', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('SL', 'Sierra Leone', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('LR', 'Liberia', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('TG', 'Togo', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('BJ', 'Benin', 'LOWER_MIDDLE_INCOME', 'Africa'),
  ('BF', 'Burkina Faso', 'LOWER_MIDDLE_INCOME', 'Africa'),
  -- Lower-Middle-Income Countries (Asia)
  ('IN', 'India', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('PK', 'Pakistan', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('BD', 'Bangladesh', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('VN', 'Vietnam', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('PH', 'Philippines', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('ID', 'Indonesia', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('LK', 'Sri Lanka', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('NP', 'Nepal', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('AF', 'Afghanistan', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('KH', 'Cambodia', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('LA', 'Laos', 'LOWER_MIDDLE_INCOME', 'Asia'),
  ('MM', 'Myanmar', 'LOWER_MIDDLE_INCOME', 'Asia'),
  -- Lower-Middle-Income Countries (Latin America & Caribbean)
  ('BR', 'Brazil', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('MX', 'Mexico', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('AR', 'Argentina', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('CO', 'Colombia', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('PE', 'Peru', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('CL', 'Chile', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('EC', 'Ecuador', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('BO', 'Bolivia', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('PY', 'Paraguay', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('DO', 'Dominican Republic', 'LOWER_MIDDLE_INCOME', 'Latin America'),
  ('JM', 'Jamaica', 'LOWER_MIDDLE_INCOME', 'Latin America')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- 12. Comments
-- ============================================================================
COMMENT ON TABLE country_classifications IS 'World Bank income classification for countries';
COMMENT ON TABLE organizations IS 'Organizations for group/institutional membership renewals';
COMMENT ON TABLE renewal_pricing IS 'Configurable renewal pricing by income tier and membership level';
COMMENT ON COLUMN members.income_tier IS 'Member income tier based on country classification';
COMMENT ON COLUMN members.renewal_anniversary IS 'Annual renewal anniversary date';
COMMENT ON COLUMN members.is_suspended IS 'Membership suspension status';
COMMENT ON COLUMN members.suspension_date IS 'Date membership was suspended';
COMMENT ON COLUMN members.organization_id IS 'Organization for group renewal discounts';
COMMENT ON COLUMN renewal_history.income_tier IS 'Income tier at time of renewal';
COMMENT ON COLUMN renewal_history.currency_used IS 'Currency used for renewal payment';
COMMENT ON COLUMN renewal_history.base_amount IS 'Base renewal amount before surcharges/discounts';
COMMENT ON COLUMN renewal_history.surcharge_amount IS 'Late renewal surcharge amount';
COMMENT ON COLUMN renewal_history.discount_amount IS 'Group/institutional discount amount';
COMMENT ON COLUMN renewal_history.discount_percentage IS 'Discount percentage applied';
COMMENT ON COLUMN renewal_history.is_late IS 'Whether renewal was processed after deadline';
