/**
 * Data Migration Script: Migrate Existing Members to Tiered Renewal System
 * 
 * This script migrates existing members to the new tiered renewal system by:
 * 1. Setting income_tier based on member's country
 * 2. Setting renewal_anniversary based on issue_date
 * 3. Updating existing renewal_history records with tier information
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * World Bank income classification mappings
 */
const HIGH_INCOME_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'IT', 'ES',
  'PT', 'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'SI', 'EE', 'LV', 'LT',
  'GR', 'CY', 'MT', 'AE', 'QA', 'KW', 'SA', 'IL', 'BH', 'OM', 'SG', 'JP', 'KR',
  'AU', 'NZ', 'HK', 'TW'
];

const LOWER_MIDDLE_INCOME_COUNTRIES = [
  'GH', 'NG', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG', 'TZ', 'ZM', 'ZW',
  'MW', 'MZ', 'BW', 'NA', 'RW', 'SN', 'CI', 'CM', 'NE', 'TD', 'CF', 'BI', 'SS',
  'SL', 'LR', 'TG', 'BJ', 'BF', 'IN', 'PK', 'BD', 'VN', 'PH', 'ID', 'LK', 'NP',
  'AF', 'KH', 'LA', 'MM', 'BR', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'BO', 'PY',
  'DO', 'JM'
];

/**
 * Get income tier for a country code
 */
function getIncomeTier(countryCode: string): 'HIGH_INCOME' | 'LOWER_MIDDLE_INCOME' {
  const code = countryCode.toUpperCase();
  
  if (HIGH_INCOME_COUNTRIES.includes(code)) {
    return 'HIGH_INCOME';
  }
  
  if (LOWER_MIDDLE_INCOME_COUNTRIES.includes(code)) {
    return 'LOWER_MIDDLE_INCOME';
  }
  
  // Default to concessionary tier for unknown countries
  return 'LOWER_MIDDLE_INCOME';
}

/**
 * Main migration function
 */
async function migrateMembers() {
  console.log("Starting migration of existing members to tiered renewal system...");
  
  try {
    // Fetch all members with their user's country
    const { data: members, error: fetchError } = await supabase
      .from("members")
      .select("id, user_id, issue_date, income_tier, renewal_anniversary, users(country)")
      .in("status", ["active", "expired", "expiring"]);
    
    if (fetchError) {
      console.error("Error fetching members:", fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${members.length} members to migrate`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const member of members) {
      try {
        const countryCode = member.users && Array.isArray(member.users) && member.users[0]?.country ? member.users[0].country : 'GH';
        const incomeTier = getIncomeTier(countryCode);
        const anniversary = member.issue_date || new Date().toISOString().split('T')[0];
        
        // Skip if already has income tier and anniversary
        if (member.income_tier && member.renewal_anniversary) {
          console.log(`Skipping member ${member.id} - already migrated`);
          skippedCount++;
          continue;
        }
        
        // Update member record
        const { error: updateError } = await supabase
          .from("members")
          .update({
            income_tier: incomeTier,
            renewal_anniversary: anniversary,
          })
          .eq("id", member.id);
        
        if (updateError) {
          console.error(`Error updating member ${member.id}:`, updateError);
          errorCount++;
          continue;
        }
        
        console.log(`Updated member ${member.id}: ${incomeTier} (${countryCode})`);
        updatedCount++;
        
      } catch (error) {
        console.error(`Error processing member ${member.id}:`, error);
        errorCount++;
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total members: ${members.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Now update existing renewal_history records
    console.log("\nUpdating existing renewal_history records...");
    
    const { data: renewalHistory, error: historyError } = await supabase
      .from("renewal_history")
      .select("id, member_id, amount_paid, currency")
      .is("income_tier", null);
    
    if (historyError) {
      console.error("Error fetching renewal history:", historyError);
      throw historyError;
    }
    
    console.log(`Found ${renewalHistory.length} renewal history records to update`);
    
    let historyUpdatedCount = 0;
    let historyErrorCount = 0;
    
    for (const history of renewalHistory) {
      try {
        // Get member's income tier
        const { data: member } = await supabase
          .from("members")
          .select("income_tier")
          .eq("id", history.member_id)
          .single();
        
        if (!member) {
          console.error(`Member not found for history ${history.id}`);
          historyErrorCount++;
          continue;
        }
        
        // Update renewal history
        const { error: updateError } = await supabase
          .from("renewal_history")
          .update({
            income_tier: member.income_tier,
            currency_used: history.currency,
            base_amount: history.amount_paid,
          })
          .eq("id", history.id);
        
        if (updateError) {
          console.error(`Error updating history ${history.id}:`, updateError);
          historyErrorCount++;
          continue;
        }
        
        historyUpdatedCount++;
        console.log(`Updated history ${history.id}`);
        
      } catch (error) {
        console.error(`Error processing history ${history.id}:`, error);
        historyErrorCount++;
      }
    }
    
    console.log("\n=== Renewal History Update Summary ===");
    console.log(`Total records: ${renewalHistory.length}`);
    console.log(`Updated: ${historyUpdatedCount}`);
    console.log(`Errors: ${historyErrorCount}`);
    
    console.log("\n=== Migration Complete ===");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateMembers();
