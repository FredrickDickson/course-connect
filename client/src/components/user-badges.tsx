import { Badge } from "@/components/ui/badge";
import { Award, Star, Crown, Shield, Zap, Flame, Heart, Trophy } from "lucide-react";

interface UserBadgesProps {
  reputationPoints?: number;
  badges?: string[];
  size?: "sm" | "md" | "lg";
}

export default function UserBadges({ reputationPoints = 0, badges = [], size = "sm" }: UserBadgesProps) {
  // Calculate badge based on reputation
  const getReputationBadge = () => {
    if (reputationPoints >= 1000) {
      return { icon: Crown, label: "Elite", color: "bg-gradient-to-r from-yellow-400 to-amber-600 text-white" };
    } else if (reputationPoints >= 500) {
      return { icon: Trophy, label: "Expert", color: "bg-gradient-to-r from-purple-400 to-purple-600 text-white" };
    } else if (reputationPoints >= 250) {
      return { icon: Star, label: "Star", color: "bg-gradient-to-r from-blue-400 to-blue-600 text-white" };
    } else if (reputationPoints >= 100) {
      return { icon: Award, label: "Contributor", color: "bg-gradient-to-r from-green-400 to-green-600 text-white" };
    } else if (reputationPoints >= 50) {
      return { icon: Shield, label: "Helper", color: "bg-gradient-to-r from-cyan-400 to-cyan-600 text-white" };
    }
    return null;
  };

  const reputationBadge = getReputationBadge();

  // Achievement badges mapping
  const achievementBadges: Record<string, { icon: any; label: string; color: string }> = {
    first_post: { icon: Sparkles, label: "First Post", color: "bg-blue-100 text-blue-700" },
    helpful_reply: { icon: Heart, label: "Helpful", color: "bg-pink-100 text-pink-700" },
    official_answer: { icon: CheckCircle, label: "Expert", color: "bg-green-100 text-green-700" },
    popular_post: { icon: Flame, label: "Trending", color: "bg-orange-100 text-orange-700" },
    top_contributor: { icon: Trophy, label: "Top", color: "bg-purple-100 text-purple-700" },
  };

  const sizeClasses = {
    sm: "h-5 w-5 text-xs",
    md: "h-6 w-6 text-sm",
    lg: "h-8 w-8 text-base",
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reputationBadge && (
        <Badge className={`${reputationBadge.color} ${sizeClasses[size]} flex items-center gap-1`}>
          <reputationBadge.icon className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"} />
          <span className="hidden sm:inline">{reputationBadge.label}</span>
        </Badge>
      )}
      {badges.map((badge) => {
        const achievement = achievementBadges[badge];
        if (!achievement) return null;
        const Icon = achievement.icon;
        return (
          <Badge key={badge} className={`${achievement.color} ${sizeClasses[size]} flex items-center gap-1`}>
            <Icon className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"} />
            <span className="hidden sm:inline">{achievement.label}</span>
          </Badge>
        );
      })}
      <Badge variant="outline" className={`${sizeClasses[size]} flex items-center gap-1`}>
        <Zap className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"} />
        <span className="hidden sm:inline">{reputationPoints}</span>
      </Badge>
    </div>
  );
}

// Import missing icons
import { Sparkles, CheckCircle } from "lucide-react";
