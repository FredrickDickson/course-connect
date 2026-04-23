import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { 
  PATHWAY_TYPES, 
  QUALIFICATION_LEVELS, 
  PATHWAY_CONFIG, 
  detectUserPathway,
  calculateProgress,
  getNextLevel,
  type PathwayType,
  type QualificationLevel
} from "../../../../shared/pathways";


export default function ProgressionBanner() {
  const { user } = useAuth();

  const { data: membership } = useQuery({
    queryKey: ["membership-level", user?.id],
    queryFn: async () => {
      // Try members table first (source of truth for active members)
      const { data: member } = await supabase
        .from("members" as any)
        .select("part")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (member) return member as any;

      // Fall back to profiles table
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("part")
        .eq("user_id", user!.id)
        .maybeSingle();
      return profile as any;
    },
    enabled: !!user,
  });

  const { data: pathway } = useQuery({
    queryKey: ["user-pathway", user?.id],
    queryFn: async () => {
      // Get user enrollments to detect pathway
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          courses!inner (
            title,
            tags
          )
        `)
        .eq("user_id", user!.id)
        .eq("status", "ACTIVE");

      // Transform data to match expected format
      const transformedEnrollments = (enrollments || []).map(enrollment => ({
        courses: {
          title: enrollment.courses?.title,
          tags: enrollment.courses?.tags || []
        }
      }));

      return detectUserPathway(transformedEnrollments);
    },
    enabled: !!user,
  });

  // If no membership part yet, show a "Start your journey" message
  if (!membership?.part) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Start Your Journey</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Complete your first course to earn your Associate designation and begin your progression.
          </p>
          <Link href="/courses">
            <Button size="sm" variant="outline">
              Browse Courses <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = membership.part as QualificationLevel;
  const currentPathway = pathway || PATHWAY_TYPES.ARBITRATION;
  const pathwayConfig = PATHWAY_CONFIG[currentPathway];
  
  // Calculate progress using shared utility
  const progressPct = calculateProgress(currentLevel);
  const nextLevel = getNextLevel(currentLevel);

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Progression</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {currentPathway === PATHWAY_TYPES.MEDIATION ? "Mediation" : "Arbitration"} Pathway
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          {QUALIFICATION_LEVELS.map((lvl, i) => {
            const currentIndex = QUALIFICATION_LEVELS.indexOf(currentLevel);
            return (
              <span key={lvl} className={i <= currentIndex ? "text-primary font-semibold" : ""}>
                {pathwayConfig.labels[lvl]}
              </span>
            );
          })}
        </div>
        <Progress value={progressPct} className="h-2 mb-3" />

        <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-semibold">Current Part</p>
        <h3 className="text-xl font-bold text-white tracking-tight">
          {pathwayConfig.labels[currentLevel] || currentLevel}
        </h3>
        <p className="text-sm text-muted-foreground">
          You're currently at {pathwayConfig.labels[currentLevel]} ({pathwayConfig.postNominals[currentLevel]}).
          {nextLevel && (
            <>
              {" "}Complete the required courses to advance to{" "}
              <span className="font-semibold text-primary">{pathwayConfig.labels[nextLevel]}</span>.
            </>
          )}
          {!nextLevel && " You've reached the highest level — congratulations!"}
        </p>

        {nextLevel && (
          <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="mt-3">
              View Pathway <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
