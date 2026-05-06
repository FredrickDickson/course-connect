/**
 * Renewal Routes
 * Provides tiered pricing based on World Bank income classifications
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
 * GET /api/renewal/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "renewal-pricing" });
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
