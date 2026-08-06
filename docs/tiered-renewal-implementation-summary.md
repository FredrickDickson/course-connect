# Tiered Membership Renewal System - Implementation Summary

## Overview

This implementation adds a tiered membership renewal system based on World Bank income classifications, as specified in the CIMA Membership Certificate Renewal Policy.

## Implementation Date
May 1, 2026

## What Was Implemented

### 1. Database Schema Changes

**New Tables:**
- `country_classifications` - World Bank income classifications for countries
- `organizations` - Organization management for group/institutional renewals
- `renewal_pricing` - Configurable pricing by income tier and membership level

**Updated Tables:**
- `members` - Added columns: `income_tier`, `renewal_anniversary`, `is_suspended`, `suspension_date`, `organization_id`
- `renewal_history` - Added columns: `income_tier`, `currency_used`, `base_amount`, `surcharge_amount`, `discount_amount`, `discount_percentage`, `is_late`, `organization_id`

### 2. Pricing System

**File:** `shared/renewal-pricing.ts`

- Tiered pricing based on World Bank income classifications
- High-Income Jurisdictions: £65 GBP / $85 USD
- Lower-Middle-Income Jurisdictions: £46 GBP / $61 USD / ₵660 GHS
- Late renewal surcharge: +15%
- Organization discounts: 10% (5-9 members), 15% (10+ members)
- Currency selection based on member's country

### 3. Country Classification System

**File:** `shared/country-classifications.ts`

- World Bank income classification mappings
- Country code to tier determination
- Country information lookup
- 90+ countries classified across both tiers

### 4. API Updates

**File:** `server/routes/renewal.ts`

**New Endpoint:**
- `GET /api/renewal/pricing?user_id=X` - Get tier-based pricing for a user

**Updated Endpoint:**
- `POST /api/renewal/webhook` - Now includes:
  - Income tier determination
  - Currency selection
  - Late renewal detection
  - Organization discount application
  - Tier information in renewal history

### 5. Frontend Updates

**File:** `client/src/pages/renew-membership.tsx`

**New Features:**
- Tier information display showing member's jurisdiction
- Currency selector (GBP/USD/GHS based on availability)
- Late renewal warning with 15% surcharge notification
- Organization discount display
- Price breakdown showing base amount, surcharges, and discounts
- Multi-currency payment support via Paystack

### 6. Data Migration

**File:** `scripts/migrate-existing-members-to-tier-system.ts`

- Migrates existing members to tier system
- Sets income tier based on country
- Sets renewal anniversary from issue date
- Updates existing renewal history records with tier information

## Pricing Structure

### High-Income Jurisdictions
- **Associate:** £65 GBP / $85 USD
- **Member:** £65 GBP / $85 USD
- **Fellow:** £65 GBP / $85 USD

### Lower-Middle-Income Jurisdictions
- **Associate:** £46 GBP / $61 USD / ₵660 GHS
- **Member:** £46 GBP / $61 USD / ₵660 GHS
- **Fellow:** £46 GBP / $61 USD / ₵660 GHS

### Additional Charges
- **Late Renewal Surcharge:** +15% (applied if >30 days past anniversary)
- **Organization Discount:** -10% (5-9 members) or -15% (10+ members)

## Payment Methods

1. **Paystack** - Card/Mobile Money (supports GBP, USD, GHS)
2. **Bank Transfer** - Admin confirmation required
3. **Mobile Money** - Ghana-specific (0241022964)

## Country Classifications

### High-Income Countries (43)
North America: US, CA
Europe: GB, IE, DE, FR, NL, BE, LU, CH, AT, IT, ES, PT, DK, SE, NO, FI, IS, PL, CZ, SK, SI, EE, LV, LT, GR, CY, MT
Middle East: AE, QA, KW, SA, IL, BH, OM
Asia-Pacific: SG, JP, KR, AU, NZ, HK, TW

### Lower-Middle-Income Countries (47)
Africa: GH, NG, KE, ZA, EG, MA, DZ, TN, ET, UG, TZ, ZM, ZW, MW, MZ, BW, NA, RW, SN, CI, CM, NE, TD, CF, BI, SS, SL, LR, TG, BJ, BF
Asia: IN, PK, BD, VN, PH, ID, LK, NP, AF, KH, LA, MM
Latin America: BR, MX, AR, CO, PE, CL, EC, BO, PY, DO, JM

## Deployment Steps

### 1. Run Database Migration
```bash
supabase db push
```

Or run the SQL manually in Supabase SQL Editor:
```sql
-- Run: supabase/migrations/20260501000000_tiered_renewal_system.sql
```

### 2. Run Data Migration Script
```bash
cd scripts
npx tsx migrate-existing-members-to-tier-system.ts
```

### 3. Verify Migration
Check that:
- All members have `income_tier` set
- All members have `renewal_anniversary` set
- `country_classifications` table is populated
- `renewal_pricing` table has default pricing

### 4. Test the System
1. Test renewal page with different country users
2. Verify currency selection works
3. Test late renewal scenario
4. Test organization discount application
5. Verify Paystack payment with different currencies

## Files Created/Modified

### Created
- `supabase/migrations/20260501000000_tiered_renewal_system.sql`
- `shared/renewal-pricing.ts`
- `shared/country-classifications.ts`
- `scripts/migrate-existing-members-to-tier-system.ts`
- `docs/tiered-renewal-implementation-summary.md`

### Modified
- `server/routes/renewal.ts`
- `client/src/pages/renew-membership.tsx`

## Key Features

1. **Automatic Tier Detection** - Based on member's country using World Bank classifications
2. **Multi-Currency Support** - GBP, USD, GHS based on jurisdiction
3. **Late Renewal Handling** - Automatic 15% surcharge for late renewals
4. **Organization Discounts** - Automatic discounts for institutional members
5. **Transparent Pricing** - Clear breakdown of base amount, surcharges, and discounts
6. **Anniversary-Based Renewals** - Renewals based on admission anniversary date
7. **Suspension Tracking** - Track suspended members for non-renewal

## Future Enhancements

1. **Admin Pricing Configuration** - UI for admins to update pricing tiers
2. **Organization Management** - Full CRUD for organizations and member assignment
3. **Bulk Renewal Processing** - Admin tool for processing group renewals
4. **Automated Suspension** - Scheduled job to suspend non-renewed members
5. **Renewal Reminders** - Enhanced n8n workflows with tier-specific messaging
6. **Currency Exchange Rates** - Dynamic currency conversion if needed

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Data migration script completes without errors
- [ ] High-income country users see correct pricing
- [ ] Lower-middle-income country users see correct pricing
- [ ] Currency selector works for multi-currency users
- [ ] Late renewal warning appears when applicable
- [ ] Organization discount displays when applicable
- [ ] Paystack payment works with different currencies
- [ ] Bank transfer flow works correctly
- [ ] Renewal history shows tier information
- [ ] Admin webhook processes tiered renewals correctly

## Rollback Plan

If issues arise, rollback steps:
1. Revert frontend changes to `renew-membership.tsx`
2. Revert API changes to `renewal.ts`
3. Drop new columns from tables:
   ```sql
   ALTER TABLE members DROP COLUMN IF EXISTS income_tier;
   ALTER TABLE members DROP COLUMN IF EXISTS renewal_anniversary;
   ALTER TABLE members DROP COLUMN IF EXISTS is_suspended;
   ALTER TABLE members DROP COLUMN IF EXISTS suspension_date;
   ALTER TABLE members DROP COLUMN IF EXISTS organization_id;
   ```
4. Drop new tables:
   ```sql
   DROP TABLE IF EXISTS renewal_pricing;
   DROP TABLE IF EXISTS organizations;
   DROP TABLE IF EXISTS country_classifications;
   ```

## Support Documentation

- CIMA Membership Certificate Renewal Policy (provided by user)
- World Bank Income Classifications (referenced in policy)
- Paystack Documentation (multi-currency support)
- Supabase Documentation (RLS policies and migrations)
