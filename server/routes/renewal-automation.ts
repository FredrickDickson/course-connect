/**
 * Renewal Automation API Routes
 * Provides endpoints for automated certificate renewal management
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  processRenewalReminders,
  updateMemberStatuses,
  RENEWAL_STAGES,
  getMembersDueForRenewal,
} from "../services/certificate-renewal-automation";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const router = Router();

// Authentication middleware for cron jobs
const authenticateCronKey = (req: Request, res: Response, next: Function) => {
  const cronKey = req.headers.authorization?.replace("Bearer ", "");
  const validKey = process.env.CRON_SECRET_KEY;

  if (!validKey) {
    return res.status(500).json({ error: "CRON_SECRET_KEY not configured" });
  }

  const cronKeyBuffer = cronKey ? Buffer.from(cronKey) : null;
  const validKeyBuffer = Buffer.from(validKey);
  const isValid =
    !!cronKeyBuffer &&
    cronKeyBuffer.length === validKeyBuffer.length &&
    crypto.timingSafeEqual(cronKeyBuffer, validKeyBuffer);

  if (!isValid) {
    return res.status(401).json({ error: "Unauthorized: Invalid cron key" });
  }

  next();
};

/**
 * POST /api/renewal-automation/process-reminders
 * Processes renewal reminders for all stages
 * Designed to be called by a daily cron job
 */
router.post(
  "/process-reminders",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      const results: Record<string, any> = {};

      // Process each reminder stage
      const stages = [
        { offset: 60, key: RENEWAL_STAGES.DAYS_60.key },
        { offset: 30, key: RENEWAL_STAGES.DAYS_30.key },
        { offset: 7, key: RENEWAL_STAGES.DAYS_7.key },
        { offset: 0, key: RENEWAL_STAGES.DAYS_0.key },
        { offset: -30, key: RENEWAL_STAGES.DAYS_NEG_30.key },
      ];

      for (const stage of stages) {
        console.log(`Processing ${stage.key} reminders...`);
        const stats = await processRenewalReminders(stage.offset, stage.key);
        results[stage.key] = stats;
      }

      // Update member statuses
      await updateMemberStatuses();

      // Calculate totals
      const totals = Object.values(results).reduce(
        (acc: any, curr: any) => ({
          processed: acc.processed + curr.processed,
          sent: acc.sent + curr.sent,
          skipped: acc.skipped + curr.skipped,
          errors: acc.errors + curr.errors,
        }),
        { processed: 0, sent: 0, skipped: 0, errors: 0 }
      );

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        totals,
      });
    } catch (error) {
      console.error("Error processing reminders:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process reminders",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/renewal-automation/process-stage
 * Process reminders for a specific stage
 */
router.post(
  "/process-stage",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      const { stage } = req.body;

      if (!stage) {
        return res.status(400).json({ error: "Stage parameter required" });
      }

      const stageConfig = Object.values(RENEWAL_STAGES).find(
        (s) => s.key === stage
      );

      if (!stageConfig) {
        return res.status(400).json({ error: "Invalid stage" });
      }

      // Map stage to days offset
      const offsetMap: Record<string, number> = {
        "60days": 60,
        "30days": 30,
        "7days": 7,
        today: 0,
        "30days_overdue": -30,
      };

      const daysOffset = offsetMap[stage];
      const stats = await processRenewalReminders(daysOffset, stage);

      res.json({
        success: true,
        stage: stageConfig.name,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error processing stage:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process stage",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/renewal-automation/upcoming-renewals
 * Get list of upcoming renewals
 */
router.get(
  "/upcoming-renewals",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      const { days = 60 } = req.query;
      const daysNumber = parseInt(days as string);

      const members = await getMembersDueForRenewal(daysNumber);

      res.json({
        success: true,
        days: daysNumber,
        count: members.length,
        members: members.map((m) => ({
          member_id: m.member_id,
          full_name: m.full_name,
          email: m.email,
          part: m.part,
          expiry_date: m.expiry_date,
          status: m.status,
          income_tier: m.income_tier,
        })),
      });
    } catch (error) {
      console.error("Error fetching upcoming renewals:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch upcoming renewals",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/renewal-automation/stats
 * Get renewal statistics
 */
router.get(
  "/stats",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      // Get counts by status
      const { data: statusCounts } = await supabaseAdmin
        .from("members")
        .select("status, count:id.count()")
        .in("status", ["active", "expiring", "expired"]);

      // Get email stats
      const { data: emailStats } = await supabaseAdmin
        .from("email_logs")
        .select("template_type, count:id.count()")
        .gte("sent_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get renewal history stats
      const { data: renewalStats } = await supabaseAdmin
        .from("renewal_history")
        .select("status, count:id.count()")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Members expiring in next 7, 30, 60 days
      const now = new Date();
      const expiringIn7 = new Date(now);
      expiringIn7.setDate(expiringIn7.getDate() + 7);
      const expiringIn30 = new Date(now);
      expiringIn30.setDate(expiringIn30.getDate() + 30);
      const expiringIn60 = new Date(now);
      expiringIn60.setDate(expiringIn60.getDate() + 60);

      const { count: count7 } = await supabaseAdmin
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .lte("expiry_date", expiringIn7.toISOString())
        .gt("expiry_date", now.toISOString());

      const { count: count30 } = await supabaseAdmin
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .lte("expiry_date", expiringIn30.toISOString())
        .gt("expiry_date", now.toISOString());

      const { count: count60 } = await supabaseAdmin
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .lte("expiry_date", expiringIn60.toISOString())
        .gt("expiry_date", now.toISOString());

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        member_status: statusCounts || [],
        email_activity_last_30_days: emailStats || [],
        renewal_activity_last_30_days: renewalStats || [],
        upcoming_expirations: {
          next_7_days: count7 || 0,
          next_30_days: count30 || 0,
          next_60_days: count60 || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/renewal-automation/update-statuses
 * Update member statuses based on expiry dates
 */
router.post(
  "/update-statuses",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      await updateMemberStatuses();

      res.json({
        success: true,
        message: "Member statuses updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating statuses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update statuses",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/renewal-automation/email-logs
 * Get email logs with optional filters
 */
router.get(
  "/email-logs",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      const { member_id, template_type, limit = 100, offset = 0 } = req.query;

      let query = supabaseAdmin
        .from("email_logs")
        .select("*, members(member_id, full_name, email)")
        .order("sent_at", { ascending: false })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1
        );

      if (member_id) {
        query = query.eq("member_id", member_id);
      }

      if (template_type) {
        query = query.eq("template_type", template_type);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        count: data?.length || 0,
        logs: data || [],
      });
    } catch (error) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch email logs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/renewal-automation/test-email
 * Test email sending for a specific member and stage
 */
router.post(
  "/test-email",
  authenticateCronKey,
  async (req: Request, res: Response) => {
    try {
      const { member_id, stage } = req.body;

      if (!member_id || !stage) {
        return res.status(400).json({
          error: "member_id and stage parameters required",
        });
      }

      const { data: member, error } = await supabaseAdmin
        .from("members")
        .select("*")
        .eq("member_id", member_id)
        .single();

      if (error || !member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Manually trigger email for testing
      const offsetMap: Record<string, number> = {
        "60days": 60,
        "30days": 30,
        "7days": 7,
        today: 0,
        "30days_overdue": -30,
      };

      const daysOffset = offsetMap[stage];
      const stats = await processRenewalReminders(daysOffset, stage);

      res.json({
        success: true,
        message: `Test email sent to ${member.email}`,
        member: {
          member_id: member.member_id,
          full_name: member.full_name,
          email: member.email,
        },
        stats,
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send test email",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/renewal-automation/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "renewal-automation",
    timestamp: new Date().toISOString(),
  });
});

export default router;
