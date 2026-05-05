import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, X, LockOpen, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import Confetti from "@/components/ui/confetti";

const LEVEL_NAMES: Record<string, string> = {
  ASSOCIATE: "Associate",
  MEMBER: "Member",
  FELLOW: "Fellow",
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  ASSOCIATE: "You can now access all Associate (Part I) courses.",
  MEMBER: "You can now access Member (Part II) courses in addition to Associate courses.",
  FELLOW: "Congratulations! You now have access to all Fellow (Part III) courses.",
};

const STORAGE_KEY_PREFIX = "level-celebration-shown-";

export default function LevelUpgradeCelebration() {
  const { user } = useAuth();
  const [upgradeInfo, setUpgradeInfo] = useState<{
    level: string;
    decisionAt: string;
    isNew: boolean;
    track?: string;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkForUpgrade = async () => {
      // Check for recent level upgrade in track_progress table
      const { data: trackProgressList } = await supabase
        .from("track_progress")
        .select("*")
        .eq("user_id", user.id);

      if (!trackProgressList || trackProgressList.length === 0) {
        return;
      }

      // Find the most recent upgrade across both tracks
      let latestUpgrade: any = null;
      let latestTrack: string | null = null;

      for (const tp of trackProgressList) {
        if (tp.level === "NONE") continue;

        const storageKey = `${STORAGE_KEY_PREFIX}${user.id}-${tp.track}-${tp.level}`;
        const alreadyShown = localStorage.getItem(storageKey);
        
        if (alreadyShown) continue;

        const updatedAt = tp.updated_at ? new Date(tp.updated_at) : null;
        const now = new Date();
        const isRecent = updatedAt 
          ? (now.getTime() - updatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000 
          : true;

        if (!latestUpgrade || (updatedAt && (!latestUpgrade.decisionAt || updatedAt > new Date(latestUpgrade.decisionAt)))) {
          latestUpgrade = {
            level: tp.level,
            decisionAt: tp.updated_at || now.toISOString(),
            isNew: isRecent,
          };
          latestTrack = tp.track;
        }
      }

      if (latestUpgrade && latestTrack) {
        setUpgradeInfo({
          ...latestUpgrade,
          track: latestTrack,
        });

        // Trigger confetti for recent upgrades
        if (latestUpgrade.isNew) {
          triggerConfetti();
          
          // Auto-hide confetti after 3 seconds
          setTimeout(() => setShowConfetti(false), 3000);
        }

        // Mark as shown
        const storageKey = `${STORAGE_KEY_PREFIX}${user.id}-${latestTrack}-${latestUpgrade.level}`;
        localStorage.setItem(storageKey, "true");
      }
    };

    checkForUpgrade();
  }, [user?.id]);

  const triggerConfetti = () => {
    setShowConfetti(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!upgradeInfo || isDismissed) {
    return null;
  }

  const levelName = LEVEL_NAMES[upgradeInfo.level] || upgradeInfo.level;
  const description = LEVEL_DESCRIPTIONS[upgradeInfo.level] || "Explore your newly unlocked courses!";

  return (
    <>
      <Confetti isActive={showConfetti} duration={3000} zIndex={100} />
      <Card className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2">
        <button 
          onClick={handleDismiss}
          className="text-amber-600/60 hover:text-amber-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Sparkle decoration */}
      <div className="absolute top-2 left-2 opacity-20">
        <Sparkles className="h-8 w-8 text-amber-500" />
      </div>
      <div className="absolute bottom-2 right-4 opacity-20">
        <Sparkles className="h-6 w-6 text-yellow-500" />
      </div>

      <CardContent className="p-5 relative z-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Level Upgrade
              </span>
              {upgradeInfo.track && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {upgradeInfo.track}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              You've been upgraded to {levelName}!
            </h3>
            
            <p className="text-sm text-gray-600 mb-3">
              {description}
            </p>

            <div className="flex flex-wrap gap-2">
              <Link href="/course-catalog">
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0">
                  <LockOpen className="h-4 w-4 mr-1.5" />
                  Explore {levelName} Courses
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              
              <Link href="/qualification-pathway">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  View Your Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t border-amber-200/60">
          <div className="flex items-center justify-between text-xs text-amber-700/70">
            <span>Your Qualification Journey</span>
            <span className="font-medium">{levelName} Unlocked</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {["ASSOCIATE", "MEMBER", "FELLOW"].map((lvl, idx) => {
              const currentIdx = ["ASSOCIATE", "MEMBER", "FELLOW"].indexOf(upgradeInfo.level);
              const isUnlocked = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              
              return (
                <div key={lvl} className="flex-1 flex items-center">
                  <div 
                    className={`h-2 flex-1 rounded-full transition-all ${
                      isUnlocked 
                        ? isCurrent 
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500" 
                          : "bg-amber-300"
                        : "bg-gray-200"
                    }`}
                  />
                  {idx < 2 && (
                    <div className={`w-1 h-2 ${isUnlocked && idx < currentIdx ? "bg-amber-300" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>Associate</span>
            <span>Member</span>
            <span>Fellow</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
