import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const LEVELS = ["associate", "member", "fellow"] as const;
const LEVEL_LABELS: Record<string, string> = { associate: "Associate", member: "Member", fellow: "Fellow" };
const LEVEL_POST: Record<string, string> = { associate: "ACIMArb", member: "MCIMArb", fellow: "FCIMArb" };

export default function ProgressionBanner() {
  const { user } = useAuth();

  const { data: membership } = useQuery({
    queryKey: ["membership-level", user?.id],
    queryFn: async () => {
      // Try members table first (source of truth for active members)
      const { data: member } = await supabase
        .from("members" as any)
        .select("membership_level")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (member) return member as any;

      // Fall back to profiles table
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("membership_level")
        .eq("user_id", user!.id)
        .maybeSingle();
      return profile as any;
    },
    enabled: !!user,
  });

  const currentLevel = membership?.membership_level || "associate";
  const currentIdx = LEVELS.indexOf(currentLevel as any);
  const progressPct = ((currentIdx + 1) / LEVELS.length) * 100;
  const nextLevel = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Progression</h3>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          {LEVELS.map((lvl, i) => (
            <span key={lvl} className={i <= currentIdx ? "text-primary font-semibold" : ""}>
              {LEVEL_LABELS[lvl]}
            </span>
          ))}
        </div>
        <Progress value={progressPct} className="h-2 mb-3" />

        <p className="text-sm text-muted-foreground">
          You're currently at <span className="font-semibold text-foreground">{LEVEL_LABELS[currentLevel]} ({LEVEL_POST[currentLevel]})</span>.
          {nextLevel && (
            <>
              {" "}Complete the required courses to advance to{" "}
              <span className="font-semibold text-primary">{LEVEL_LABELS[nextLevel]}</span>.
            </>
          )}
          {!nextLevel && " You've reached the highest level — congratulations!"}
        </p>

        {nextLevel && (
          <Link href="/qualification-pathway">
            <Button size="sm" variant="outline" className="mt-3">
              View Pathway <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
