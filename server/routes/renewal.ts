/**
 * Renewal Routes
 * Handles manual renewal triggers for admin-confirmed bank transfers
 * Implements tiered pricing based on World Bank income classifications
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { getIncomeTier, getCountryInfo } from "../../shared/country-classifications";
import { calculateRenewalPrice, isRenewalLate, getDefaultCurrency, type IncomeTier, type MembershipLevel, type Currency } from "../../shared/renewal-pricing";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * POST /api/renewal/webhook
 * Manual trigger for admin-confirmed bank transfer renewals
 * Calls n8n webhook to process renewal and generate certificate
 */
router.post("/webhook", async (req: AuthRequest, res: Response) => {
  try {
    const { member_id, renewal_history_id } = req.body;

    // Validate required fields
    if (!member_id || !renewal_history_id) {
      return res.status(400).json({ error: "Missing required fields: member_id, renewal_history_id" });
    }

    // Get member details with user info for country classification
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("*, users!inner(country)")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Get renewal history
    const { data: renewalHistory, error: historyError } = await supabaseAdmin
      .from("renewal_history")
      .select("*")
      .eq("id", renewal_history_id)
      .single();

    if (historyError || !renewalHistory) {
      return res.status(404).json({ error: "Renewal history not found" });
    }

    // Determine income tier and pricing
    const countryCode = member.users?.country || 'GH'; // Default to Ghana if no country
    const incomeTier = getIncomeTier(countryCode);
    const membershipLevel = (member.part?.toUpperCase() || 'MEMBER') as MembershipLevel;
    const defaultCurrency = getDefaultCurrency(countryCode) as Currency;

    // Check if renewal is late
    const anniversaryDate = member.renewal_anniversary || member.issue_date;
    const isLate = anniversaryDate ? isRenewalLate(new Date(anniversaryDate)) : false;

    // Get organization discount if applicable
    let discountPercentage = 0;
    let organizationId = null;
    if (member.organization_id) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("discount_tier")
        .eq("id", member.organization_id)
        .single();
      
      if (org) {
        organizationId = member.organization_id;
        if (org.discount_tier === '15_PERCENT') discountPercentage = 15;
        else if (org.discount_tier === '10_PERCENT') discountPercentage = 10;
      }
    }

    // Calculate pricing
    const pricing = calculateRenewalPrice(
      incomeTier,
      membershipLevel,
      defaultCurrency,
      isLate,
      discountPercentage
    );

    // Update member record
    const today = new Date();
    const newExpiry = new Date(today);
    newExpiry.setDate(newExpiry.getDate() + 365);

    const todayStr = today.toISOString().split("T")[0];
    const expiryStr = newExpiry.toISOString().split("T")[0];

    // Set renewal anniversary if not already set (use issue_date as reference)
    const anniversary = member.renewal_anniversary || member.issue_date || todayStr;

    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        issue_date: todayStr,
        expiry_date: expiryStr,
        status: "active",
        renewal_count: (member.renewal_count || 0) + 1,
        last_renewal_at: todayStr,
        renewal_anniversary: anniversary,
        income_tier: incomeTier,
        is_suspended: false,
        suspension_date: null,
      })
      .eq("id", member_id);

    if (updateError) {
      console.error("Member update error:", updateError);
      return res.status(500).json({ error: "Failed to update member" });
    }

    // Update renewal history with tier information
    const { error: historyUpdateError } = await supabaseAdmin
      .from("renewal_history")
      .update({
        status: "confirmed",
        confirmed_at: todayStr,
        income_tier: incomeTier,
        currency_used: defaultCurrency,
        base_amount: pricing.baseAmount,
        surcharge_amount: pricing.lateSurcharge,
        discount_amount: pricing.discountAmount,
        discount_percentage: pricing.discountPercentage,
        is_late: isLate,
        organization_id: organizationId,
      })
      .eq("id", renewal_history_id);

    if (historyUpdateError) {
      console.error("Renewal history update error:", historyUpdateError);
      // Don't fail the request, just log the error
    }

    // Trigger n8n webhook for certificate generation
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.N8N_API_KEY || ""}`,
          },
          body: JSON.stringify({
            member_id: member.member_id,
            full_name: member.full_name,
            membership_level: member.part,
            email: member.email,
            issue_date: todayStr,
            expiry_date: expiryStr,
            renewal_count: (member.renewal_count || 0) + 1,
            payment_method: "bank_transfer",
            amount: pricing.totalAmount,
            currency: defaultCurrency,
            income_tier: incomeTier,
            is_late: isLate,
          }),
        });
      } catch (n8nError) {
        console.error("n8n webhook error:", n8nError);
        // Don't fail the request, n8n can be retried later
      }
    }

    res.json({
      success: true,
      message: "Renewal processed successfully",
      member_id: member_id,
      new_expiry_date: expiryStr,
      pricing: {
        income_tier: incomeTier,
        currency: defaultCurrency,
        base_amount: pricing.baseAmount,
        total_amount: pricing.totalAmount,
        is_late: isLate,
        discount_percentage: pricing.discountPercentage,
      }
    });
  } catch (error) {
    console.error("Renewal webhook error:", error);
    res.status(500).json({ error: "Failed to process renewal" });
  }
});

/**
 * GET /api/renewal/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "renewal-webhook" });
});

/**
 * GET /api/renewal/pricing
 * Get renewal pricing for a user
 */
router.get("/pricing", async (req: AuthRequest, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }

    // Get member details with user info
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("*, users!inner(country)")
      .eq("user_id", user_id)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Determine income tier and pricing
    const countryCode = member.users?.country || 'GH';
    const incomeTier = getIncomeTier(countryCode);
    const membershipLevel = (member.part?.toUpperCase() || 'MEMBER') as MembershipLevel;
    const defaultCurrency = getDefaultCurrency(countryCode) as Currency;
    const availableCurrencies = incomeTier === 'HIGH_INCOME' ? ['GBP', 'USD'] : ['GBP', 'USD', 'GHS'];

    // Check if renewal is late
    const anniversaryDate = member.renewal_anniversary || member.issue_date;
    const isLate = anniversaryDate ? isRenewalLate(new Date(anniversaryDate)) : false;

    // Get organization discount if applicable
    let discountPercentage = 0;
    let organizationId = null;
    let organizationName = null;
    if (member.organization_id) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("discount_tier, name")
        .eq("id", member.organization_id)
        .single();
      
      if (org) {
        organizationId = member.organization_id;
        organizationName = org.name;
        if (org.discount_tier === '15_PERCENT') discountPercentage = 15;
        else if (org.discount_tier === '10_PERCENT') discountPercentage = 10;
      }
    }

    // Calculate pricing for all available currencies
    const pricingOptions = availableCurrencies.map(curr => {
      const pricing = calculateRenewalPrice(
        incomeTier,
        membershipLevel,
        curr as Currency,
        isLate,
        discountPercentage
      );
      return pricing;
    });

    res.json({
      success: true,
      data: {
        income_tier: incomeTier,
        membership_level: membershipLevel,
        country_code: countryCode,
        country_name: getCountryInfo(countryCode).name,
        default_currency: defaultCurrency,
        available_currencies: availableCurrencies,
        is_late: isLate,
        renewal_anniversary: member.renewal_anniversary || member.issue_date,
        organization: organizationId ? {
          id: organizationId,
          name: organizationName,
          discount_percentage: discountPercentage
        } : null,
        pricing_options: pricingOptions
      }
    });
  } catch (error) {
    console.error("Pricing endpoint error:", error);
    res.status(500).json({ error: "Failed to get pricing" });
  }
});

export default router;
