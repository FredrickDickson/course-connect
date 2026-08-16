# CIMA Renewal Fee System - Complete Analysis

## Overview

The CIMA (Center for International Mediators and Arbitrators) renewal fee system is a sophisticated, tiered pricing mechanism based on **World Bank income classifications**. It implements fair pricing for members from different economic backgrounds while supporting organizational discounts and late payment surcharges.

---

## 📊 Pricing Structure

### Base Pricing by Income Tier

The system uses two income tiers based on World Bank classifications:

#### **HIGH_INCOME Jurisdictions**
- **GBP:** £65.00
- **USD:** $85.00
- **GHS:** Not available

**Countries:** US, Canada, UK, Ireland, Germany, France, Netherlands, Belgium, Switzerland, Austria, Italy, Spain, Denmark, Sweden, Norway, UAE, Qatar, Kuwait, Saudi Arabia, Singapore, Japan, South Korea, Australia, New Zealand, Hong Kong, Taiwan, and more.

#### **LOWER_MIDDLE_INCOME Jurisdictions**
- **GBP:** £46.00
- **USD:** $61.00
- **GHS:** ₵660.00

**Countries:** Ghana, Nigeria, Kenya, South Africa, Egypt, Morocco, India, Pakistan, Bangladesh, Vietnam, Philippines, Indonesia, Brazil, Mexico, Argentina, Colombia, Jamaica, and more.

### Membership Levels

All three membership levels (Associate, Member, Fellow) have the **same base fee** within each income tier:
- **Associate (ACIMArb)**
- **Member (MCIMArb)**
- **Fellow (FCIMArb)**

---

## 💰 Fee Calculation Components

The final renewal fee is calculated using this formula:

```
Total Fee = Base Amount + Late Surcharge - Organization Discount
```

### 1. **Base Amount**
- Determined by income tier and currency
- Fixed amounts (see pricing structure above)

### 2. **Late Surcharge (15%)**
Applied when renewal is more than 30 days past the renewal anniversary date.

**Example:**
- Base: £46.00
- Late Surcharge: £46.00 × 15% = £6.90
- Subtotal: £52.90

**Late Calculation Logic:**
```typescript
function isRenewalLate(anniversaryDate: Date): boolean {
  const today = new Date();
  const anniversary = new Date(anniversaryDate);
  anniversary.setFullYear(today.getFullYear());
  
  if (anniversary > today) {
    anniversary.setFullYear(today.getFullYear() - 1);
  }
  
  const daysPast = (today.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24);
  return daysPast > 30;
}
```

### 3. **Organization Discount**
For members affiliated with organizations:

| Member Count | Discount Tier | Discount % |
|-------------|---------------|------------|
| < 5 members | NONE | 0% |
| 5-9 members | 10_PERCENT | 10% |
| 10+ members | 15_PERCENT | 15% |

**Example with 15% org discount:**
- Base: £46.00
- Organization Discount: £46.00 × 15% = £6.90
- Final: £39.10

**Combined Example (Late + Discount):**
- Base: £46.00
- Late Surcharge: +£6.90 (15%)
- Organization Discount: -£7.94 (15% of £52.90)
- **Final Total: £44.96**

---

## 🌍 Currency Selection

### Default Currency Assignment
- **Ghana (GH):** GHS (₵)
- **High-Income Countries:** USD ($)
- **Lower-Middle-Income Countries:** USD ($)

### Available Currencies by Tier
- **HIGH_INCOME:** GBP, USD
- **LOWER_MIDDLE_INCOME:** GBP, USD, GHS

Members can select their preferred currency during checkout from the available options for their tier.

---

## 🔄 Renewal Process Flow

### 1. **Member Accesses Renewal Page**
```
GET /api/renewal/pricing
```

**Response includes:**
- Income tier determination (based on user's country)
- Membership level (Associate/Member/Fellow)
- All available currency options with calculated totals
- Late status
- Organization discount (if applicable)

### 2. **Pricing Calculation**
The system:
1. Fetches member's country from user profile
2. Determines income tier using World Bank classification
3. Checks if renewal is late (>30 days past anniversary)
4. Retrieves organization discount (if member has organization_id)
5. Calculates pricing for all available currencies
6. Returns complete pricing data to frontend

### 3. **Payment Processing**
- **Payment Gateway:** Paystack
- **Payment Currency:** Always GHS (₵) for Paystack
- **Conversion:** Frontend finds GHS pricing option and multiplies by 100 for pesewas
- **Metadata Sent:** member_id, type, full_name, membership_level, email, currency, display_amount, ghs_amount, income_tier

### 4. **Payment Confirmation**
```javascript
// Paystack popup callback triggers polling
pollRenewalStatus({
  reference: response.reference,
  amount: renewalFee,
  currency: selectedCurrency
});
```

**Polling Logic:**
- Polls `GET /api/renewal/status` every 2 seconds
- Checks if `last_renewal_at` timestamp is newer than payment start time
- Timeout: 20 seconds
- Falls back to "certificate on the way" messaging if webhook hasn't confirmed yet

### 5. **Webhook Processing**
The Paystack webhook (`/functions/v1/paystack-webhook`) verifies payment and applies renewal effects:

1. **Member Record Updated:**
   - `expiry_date`: Extended by 12 months from current expiry
   - `status`: Set to "active"
   - `renewal_count`: Incremented by 1
   - `last_renewal_at`: Today's date
   - `renewal_anniversary`: Set to issue_date or existing anniversary
   - `income_tier`: Stored for historical records
   - `is_suspended`: Set to false (reinstates if expired)

2. **Renewal History Record Created:**
   ```sql
   INSERT INTO renewal_history (
     member_id, renewal_date, new_expiry_date, amount_paid,
     currency_used, payment_method, payment_reference,
     income_tier, base_amount, surcharge_amount, discount_amount,
     discount_percentage, is_late, organization_id
   )
   ```

3. **Activity Log Entry:**
   - Event: `renewal_payment_succeeded`
   - Tracks payment details for audit trail

4. **Certificate Generation:**
   - Calls internal certificate generation API
   - New certificate issued with:
     - Updated issue_date (today)
     - New expiry_date (12 months from old expiry)
     - Updated renewal_count
   - Certificate URL stored in member record
   - Certificate automatically emailed to member

---

## 📧 Automated Reminder System

### Reminder Stages

The system sends automated email reminders at these intervals:

| Days Until Expiry | Stage | Template Key | Urgency |
|------------------|-------|--------------|---------|
| 60 days | First Reminder | `60days` | Normal |
| 30 days | Second Reminder | `30days` | Normal |
| 7 days | Urgent Reminder | `7days` | Urgent |
| 0 days (today) | Expiry Notice | `today` | Urgent |
| -30 days (overdue) | Overdue Notice | `30days_overdue` | Overdue |

### Reminder Email Features

Each reminder includes:
- ✅ Member details (name, ID, level, expiry date)
- ✅ Post-nominal designation (ACIMArb/MCIMArb/FCIMArb)
- ✅ Pricing in all available currencies
- ✅ Organization discount badge (if applicable)
- ✅ Late surcharge warning (if applicable)
- ✅ **Auto-start payment link** (member-specific URL)
- ✅ Renewal benefits list
- ✅ Professional HTML template with urgency-based styling

**Auto-start Feature:**
```
https://cima-learn.vercel.app/renew-membership?autostart=1&member_id=CMA2025001
```
When members click the CTA button in the email, the payment popup launches automatically.

### Reminder Scheduling

**Cron Job:** `renewal-reminders`
- **Schedule:** Daily at 6:00 AM UTC
- **Implementation:** `pg_cron` calls Edge Function via `net.http_post`
- **Deduplication:** Each reminder type is logged; emails are sent only once per stage per member

**Database:**
```sql
-- Email log prevents duplicate sends
CREATE TABLE email_logs (
  member_id UUID,
  template_type VARCHAR,
  email_to VARCHAR,
  subject VARCHAR,
  status VARCHAR,
  provider VARCHAR,
  provider_message_id VARCHAR,
  sent_at TIMESTAMP
);
```

---

## 🗄️ Database Schema

### Key Tables

#### **renewal_pricing**
```sql
CREATE TABLE renewal_pricing (
  id UUID PRIMARY KEY,
  income_tier VARCHAR(50) CHECK (income_tier IN ('HIGH_INCOME', 'LOWER_MIDDLE_INCOME')),
  membership_level VARCHAR(20) CHECK (membership_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  currency VARCHAR(3) CHECK (currency IN ('GBP', 'USD', 'GHS')),
  base_amount DECIMAL(10,2) NOT NULL,
  late_surcharge_percentage DECIMAL(5,2) DEFAULT 15.00,
  effective_from DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(income_tier, membership_level, currency, effective_from)
);
```

#### **country_classifications**
```sql
CREATE TABLE country_classifications (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  income_tier VARCHAR(50) NOT NULL,
  region VARCHAR(50)
);
```

#### **organizations**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(50),
  discount_tier VARCHAR(20) DEFAULT 'NONE' 
    CHECK (discount_tier IN ('NONE', '10_PERCENT', '15_PERCENT')),
  member_count INTEGER DEFAULT 0
);
```

#### **members** (renewal fields)
```sql
ALTER TABLE members ADD COLUMN
  income_tier VARCHAR(50),
  renewal_anniversary DATE,
  renewal_count INTEGER DEFAULT 0,
  last_renewal_at DATE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_date DATE,
  organization_id UUID REFERENCES organizations(id);
```

#### **renewal_history**
```sql
CREATE TABLE renewal_history (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  renewal_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency_used VARCHAR(3),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  income_tier VARCHAR(50),
  base_amount DECIMAL(10,2),
  surcharge_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_percentage DECIMAL(5,2) DEFAULT 0.00,
  is_late BOOLEAN DEFAULT FALSE,
  organization_id UUID,
  notes TEXT,
  created_by UUID
);
```

---

## 🔐 Security & Compliance

### Row-Level Security (RLS)

**renewal_pricing:**
```sql
-- Public read access (pricing is transparent)
CREATE POLICY "Public can read renewal_pricing"
  ON renewal_pricing FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage renewal_pricing"
  ON renewal_pricing FOR ALL 
  USING (auth.role() = 'service_role');
```

**country_classifications:**
- Public read access
- Service role write access

**organizations:**
- Members can read their own organization
- Admins can manage all organizations

### Authentication
- All renewal endpoints require Supabase JWT authentication
- Rate limiting via `eligibilityLimiter` middleware
- Service role key stored in Supabase Vault for cron jobs

---

## 📈 Key Features & Benefits

### 1. **Economic Fairness**
- Tiered pricing based on World Bank income classifications
- Lower fees for developing economies (£46 vs £65)
- Ghana-specific currency option (GHS)

### 2. **Flexible Pricing**
- Multi-currency support (GBP, USD, GHS)
- Organization-based bulk discounts (up to 15%)
- Late payment surcharges to encourage timely renewal

### 3. **Automation**
- 5-stage automated email reminder system
- Daily status sync via cron jobs
- Auto-expiry detection and status updates
- Automatic certificate generation and delivery

### 4. **User Experience**
- Auto-start payment from email CTAs
- Real-time polling for payment confirmation
- Comprehensive renewal history tracking
- Clear pricing breakdown (base + surcharge - discount)

### 5. **Compliance & Auditing**
- Complete payment history in `renewal_history`
- Email logs for all communications
- Activity logging for audit trails
- Price versioning via `effective_from` dates

---

## 🔧 Technical Implementation

### Backend Stack
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **Edge Functions:** Deno (Supabase Edge Runtime)
- **Scheduling:** pg_cron + pg_net
- **Email Provider:** Brevo (formerly SendinBlue)
- **Payment Gateway:** Paystack

### Frontend Stack
- **Framework:** React + TypeScript
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** React Query (TanStack Query)
- **Routing:** Wouter

### Key Files

**Pricing Logic:**
- `shared/renewal-pricing.ts` - Core pricing calculations
- `shared/country-classifications.ts` - World Bank tier mappings
- `server/routes/renewal.ts` - Pricing API endpoints

**Database:**
- `supabase/migrations/20260501000000_tiered_renewal_system.sql` - Schema

**Automation:**
- `server/services/certificate-renewal-automation.ts` - Reminder service
- `supabase/functions/renewal-reminders/index.ts` - Cron-triggered Edge Function

**Webhook:**
- `supabase/functions/paystack-webhook/index.ts` - Payment verification
- `supabase/functions/_shared/renewal-effects.ts` - Renewal application logic

**Frontend:**
- `client/src/pages/renew-membership.tsx` - Renewal UI

---

## 📊 Example Scenarios

### Scenario 1: UK Member, On-Time Renewal
- **Country:** United Kingdom (GB)
- **Income Tier:** HIGH_INCOME
- **Level:** Member (MCIMArb)
- **Late:** No
- **Organization:** None

**Pricing:**
- GBP: £65.00
- USD: $85.00

**Final Fee:** £65.00 or $85.00 (member's choice)

---

### Scenario 2: Ghana Member, Late Renewal, Organization Discount
- **Country:** Ghana (GH)
- **Income Tier:** LOWER_MIDDLE_INCOME
- **Level:** Fellow (FCIMArb)
- **Late:** Yes (45 days past anniversary)
- **Organization:** Legal Firm (10 members) = 15% discount

**Calculation (GHS):**
- Base: ₵660.00
- Late Surcharge (15%): +₵99.00
- Subtotal: ₵759.00
- Organization Discount (15%): -₵113.85
- **Final Fee: ₵645.15**

---

### Scenario 3: Nigerian Member, Multiple Currency Options
- **Country:** Nigeria (NG)
- **Income Tier:** LOWER_MIDDLE_INCOME
- **Level:** Associate (ACIMArb)
- **Late:** No
- **Organization:** None

**Pricing Options:**
- GBP: £46.00
- USD: $61.00
- GHS: ₵660.00

**Final Fee:** Member chooses preferred currency

---

## 🚀 Future Enhancements

Based on the current implementation, potential improvements could include:

1. **Upper-Middle Income Tier:** Add a third tier for countries like China, Russia, Turkey
2. **Dynamic Exchange Rates:** Real-time currency conversion
3. **Payment Plans:** Installment options for larger organizations
4. **Early Bird Discounts:** Incentive for renewals >60 days before expiry
5. **Student Discounts:** Reduced rates for students and recent graduates
6. **Regional Coordinators:** Localized support and payment options

---

## 📞 Support & Questions

For renewal fee questions:
- **Email:** admin@thecima.org
- **Website:** https://thecima.org
- **Company:** Center for International Mediators and Arbitrators
- **Registration:** Company No. 16140063 (England & Wales)

---

## Summary

The CIMA renewal fee system is a well-architected, equitable pricing mechanism that:
- ✅ Provides fair pricing based on economic status
- ✅ Supports multiple currencies and payment methods
- ✅ Automates reminders and certificate generation
- ✅ Tracks comprehensive audit trails
- ✅ Offers organizational discounts
- ✅ Enforces late payment accountability
- ✅ Delivers excellent user experience

The system balances fairness, automation, and business needs while maintaining transparency and compliance.
