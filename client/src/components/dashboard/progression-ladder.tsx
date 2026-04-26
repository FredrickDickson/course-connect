import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Lock, 
  PlayCircle, 
  Award,
  Crown,
  Shield,
  GraduationCap,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { 
  PATHWAY_TYPES, 
  getPathwayConfig, 
  type PathwayType,
  type QualificationLevel,
  QUALIFICATION_LEVELS
} from "../../../../shared/pathways";

interface ProgressionLadderProps {
  userLevel: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  pathway: PathwayType;
  completedLevels?: QualificationLevel[];
  currentCourse?: {
    id: string;
    title: string;
    progress: number;
    level: string;
  } | null;
  nextCourse?: {
    id: string;
    title: string;
    level: string;
  } | null;
}

const LEVEL_ORDER = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];

const LEVEL_CONFIG: Record<string, {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  NONE: {
    icon: GraduationCap,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200"
  },
  STUDENT: {
    icon: GraduationCap,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  ASSOCIATE: {
    icon: Shield,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    borderColor: "border-secondary/30"
  },
  MEMBER: {
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  FELLOW: {
    icon: Crown,
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/30"
  }
};

export default function ProgressionLadder({
  userLevel = "NONE",
  pathway = PATHWAY_TYPES.ARBITRATION,
  completedLevels = [],
  currentCourse,
  nextCourse
}: ProgressionLadderProps) {
  const pathwayConfig = getPathwayConfig(pathway);
  const normalizedUserLevel = userLevel.toUpperCase();
  const userIndex = LEVEL_ORDER.indexOf(normalizedUserLevel);
  
  // Filter to only qualification levels (exclude NONE, STUDENT)
  const ladderLevels = QUALIFICATION_LEVELS;
  
  // Calculate overall progress
  const progressPercent = Math.min(
    ((userIndex) / (LEVEL_ORDER.length - 1)) * 100,
    100
  );

  const getLevelStatus = (level: QualificationLevel) => {
    const levelIndex = LEVEL_ORDER.indexOf(level.toUpperCase());
    
    if (completedLevels.includes(level)) {
      return "completed";
    }
    if (levelIndex === userIndex) {
      return "current";
    }
    if (levelIndex < userIndex) {
      return "completed"; // Should be in completedLevels but fallback
    }
    return "locked";
  };

  const getNextAction = () => {
    if (currentCourse) {
      return {
        label: "Continue Learning",
        href: `/learn/${currentCourse.id}`,
        description: currentCourse.title
      };
    }
    if (nextCourse) {
      return {
        label: `Start ${nextCourse.level}`,
        href: `/course/${nextCourse.id}`,
        description: nextCourse.title
      };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5" style={{ color: pathwayConfig.colors.primary }} />
              Your Progression Path
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {pathwayConfig.name} Pathway ({pathwayConfig.postNominals.fellow})
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            {progressPercent.toFixed(0)}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Start</span>
            <span>Fellowship</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Ladder steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {ladderLevels.map((level, index) => {
              const status = getLevelStatus(level);
              const config = LEVEL_CONFIG[level.toUpperCase()];
              const LevelIcon = config.icon;
              const isCurrent = status === "current";
              const isCompleted = status === "completed";
              const isLocked = status === "locked";
              
              const postNominal = pathwayConfig.postNominals[level];
              const levelLabel = pathwayConfig.labels[level];

              return (
                <div 
                  key={level}
                  className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all ${
                    isCurrent 
                      ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-1` 
                      : isCompleted
                        ? "bg-green-50/50 border-green-100"
                        : "bg-muted/50 border-border opacity-60"
                  }`}
                  style={isCurrent ? { 
                    ['--tw-ring-color' as string]: pathwayConfig.colors.primary 
                  } : {}}
                >
                  {/* Icon circle */}
                  <div 
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted 
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? config.bgColor
                          : "bg-gray-200 text-gray-400"
                    }`}
                    style={isCurrent ? { backgroundColor: pathwayConfig.colors.primary + '20' } : {}}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <LevelIcon className="w-6 h-6" style={{ color: isCurrent ? pathwayConfig.colors.primary : undefined }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold ${isCurrent ? config.color : 'text-foreground'}`}>
                        {levelLabel}
                      </h4>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {postNominal}
                      </Badge>
                      {isCurrent && (
                        <Badge className="text-[10px]" style={{ backgroundColor: pathwayConfig.colors.primary }}>
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {isCompleted && "Completed successfully"}
                      {isCurrent && currentCourse && `In progress: ${currentCourse.title}`}
                      {isCurrent && !currentCourse && "Ready to start - Enroll now"}
                      {isLocked && `Complete ${LEVEL_ORDER[LEVEL_ORDER.indexOf(level.toUpperCase()) - 1]} first`}
                    </p>

                    {/* Progress bar for current level */}
                    {isCurrent && currentCourse && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Course Progress</span>
                          <span>{currentCourse.progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={currentCourse.progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Action button */}
                    {isCurrent && (
                      <div className="mt-3">
                        {nextAction ? (
                          <Link href={nextAction.href}>
                            <Button 
                              size="sm" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: pathwayConfig.colors.primary,
                                borderColor: pathwayConfig.colors.primary 
                              }}
                            >
                              {nextAction.label}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        ) : (
                          <Link href="/course-catalog">
                            <Button size="sm" variant="outline" className="text-xs">
                              Browse Courses
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expedited option */}
        {userLevel === "ASSOCIATE" && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-medium text-primary">Fast-track your progress</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Have prior ADR experience? You may qualify for expedited assessment.
                </p>
                <Link href="/qualification-pathway">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-2">
                    Check eligibility
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
