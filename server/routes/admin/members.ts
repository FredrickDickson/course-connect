import { Router, Request, Response } from "express";
import { requireSupabaseAuth } from "../../supabaseAuth";
import { requireRole } from "../../middleware/roleProtection";
import { supabaseAdmin } from "../../storage";

const router = Router();

router.post(
  "/:id/auto-renew",
  requireSupabaseAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const memberId = req.params.id;
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled boolean required" });
      }

      const { data, error } = await supabaseAdmin
        .from("members")
        .update({ auto_renew: enabled })
        .eq("member_id", memberId);

      if (error) throw error;

      res.json({ success: true, member: data?.[0] || null });
    } catch (err) {
      console.error("Error toggling auto_renew:", err);
      res.status(500).json({ success: false, error: "Failed to update member" });
    }
  }
);

router.get(
  "/:id/auto-renew",
  requireSupabaseAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const memberId = req.params.id;
      const { data, error } = await supabaseAdmin
        .from("members")
        .select("member_id, auto_renew")
        .eq("member_id", memberId)
        .single();

      if (error) throw error;
      res.json({ success: true, member: data });
    } catch (err) {
      console.error("Error fetching auto_renew status:", err);
      res.status(500).json({ success: false, error: "Failed to fetch member" });
    }
  }
);

export default router;
