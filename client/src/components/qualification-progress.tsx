import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  Shield, 
  Star, 
  Award, 
  CheckCircle2, 
  Lock, 
  Zap, 
  ArrowRight,
  Clock,
  BookOpen,
  Scale,
  Users,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import React from "react";
import { 
  getQualificationState, 
  getEligibility,
  type UserQualificationState,
  type EligibilityResponse
} from "@/lib/qualification-api";

interface TrackProgress {
  level: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  pathway?: "STANDARD" | "EXPEDITED" | "HYBRID" | null;
}

interface QualificationProgressProps {
  tracks?: {
    arbitration: TrackProgress;
    mediation: TrackProgress;
  };
  yearsAdrExperience?: number;
  yearsLegalExperience?: number;
  eligibility?: {
    arbitration: {
      canTakePart1: boolean;
      canTakePart2: boolean;
      canApplyFellow: boolean;
      canUseExpedited: boolean;
    };
    mediation: {
      canTakeAssociate: boolean;
      canTakeMember: boolean;
      canApplyFellow: boolean;
    };
  };
}

function getTrackLevels(track: "ARBITRATION" | "MEDIATION") {
  const isArbitration = track === "ARBITRATION";
  return [
    {
      key: "ASSOCIATE",
      name: "Associate",
      postNominal: isArbitration ? "ACIMArb" : "ACIMed",
      icon: Shield,
      color: "text-primary",
      bgColor: "bg-primary/5",
      borderColor: "border-primary/20",
      description: isArbitration
        ? "Foundation level - Introduction to Arbitration"
        : "Foundation level - Introduction to Mediation",
    },
    {
      key: "MEMBER",
      name: "Member",
      postNominal: isArbitration ? "MCIMArb" : "MCIMed",
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-500/5",
      borderColor: "border-amber-500/20",
      description: isArbitration
        ? "Applied practice - Advanced Arbitration"
        : "Applied practice - Advanced Mediation",
    },
    {
      key: "FELLOW",
      name: "Fellow",
      postNominal: isArbitration ? "FCIMArb" : "FCIMed",
      icon: Award,
      color: "text-primary",
      bgColor: "bg-gradient-to-r from-primary/5 to-amber-500/5",
      borderColor: "border-primary/30",
      description: isArbitration
        ? "Mastery level - Certified International Arbitrator"
        : "Mastery level - Certified International Mediator",
    },
  ];
}

function TrackProgressCard({
  track,
  progress,
  eligibility,
}: {
  track: "ARBITRATION" | "MEDIATION";
  progress: TrackProgress;
  eligibility: any;
}) {
  const levels = getTrackLevels(track);
  const isArbitration = track === "ARBITRATION";
  const trackIcon = isArbitration ? Scale : Users;
  const trackName = isArbitration ? "Arbitration" : "Mediation";

  const getCurrentLevelIndex = () => {
    if (progress.level === "NONE" || progress.level === "STUDENT") return -1;
    return levels.findIndex((l) => l.key === progress.level);
  };

  const currentLevelIndex = getCurrentLevelIndex();

  return (
    <div className="space-y-4">
      {/* Track Header */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          {React.createElement(trackIcon, { className: `w-5 h-5 ${isArbitration ? "text-primary" : "text-blue-600"}` })}
          <div>
            <div className="text-sm text-muted-foreground">Track</div>
            <div className="text-lg font-bold">{trackName}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Current Level</div>
          <div className="text-lg font-bold">
            {progress.level === "NONE" || progress.level === "STUDENT"
              ? "Not Started"
              : levels[currentLevelIndex]?.name}
          </div>
          {progress.level !== "NONE" && progress.level !== "STUDENT" && (
            <Badge className="mt-1" variant="outline">
              {levels[currentLevelIndex]?.postNominal}
            </Badge>
          )}
        </div>
      </div>

      {/* Pathway Badge */}
      {progress.pathway && (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          {progress.pathway} Pathway
        </Badge>
      )}

      {/* Progress Path */}
      <div className="space-y-3">
        {levels.map((level, index) => {
          const LevelIcon = level.icon;
          const isCompleted = index <= currentLevelIndex;
          const isCurrent = index === currentLevelIndex;
          const isLocked = index > currentLevelIndex;
          const isNext = index === currentLevelIndex + 1;

          return (
            <div
              key={level.key}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                isCompleted
                  ? `${level.bgColor} ${level.borderColor} border-opacity-50`
                  : isCurrent
                  ? `${level.bgColor} ${level.borderColor} border-opacity-100`
                  : "bg-muted/30 border-border/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? level.bgColor : "bg-muted"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className={`w-5 h-5 ${level.color}`} />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <LevelIcon className={`w-5 h-5 ${level.color}`} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{level.name}</h4>
                      {isCompleted && (
                        <Badge className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                          Completed
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {level.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {level.postNominal}
                    </Badge>
                  </div>
                </div>
                {isNext && (
                  <Link href="/courses">
                    <Button size="sm" className="shrink-0">
                      Enroll
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expedited Options - Arbitration Only */}
      {isArbitration && eligibility.canUseExpedited && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold">Expedited Routes Available</h4>
          </div>
          <div className="space-y-2">
            {progress.level !== "MEMBER" && progress.level !== "FELLOW" && (
              <Link href="/expedited-application">
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2 text-amber-600" />
                  Apply for Expedited Member (MCIMArb)
                </Button>
              </Link>
            )}
            {progress.level === "MEMBER" && (
              <Link href="/expedited-application">
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2 text-amber-600" />
                  Apply for Expedited Fellow (FCIMArb)
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Fellowship Application - Both Tracks */}
      {eligibility.canApplyFellow && progress.level === "MEMBER" && (
        <div className="pt-4 border-t">
          <Link href="/fellowship-application">
            <Button variant="outline" className="w-full justify-start">
              <Award className="w-4 h-4 mr-2 text-primary" />
              Apply for Fellowship ({isArbitration ? "FCIMArb" : "FCIMed"})
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export function QualificationProgress({
  tracks: initialTracks,
  yearsAdrExperience: initialYearsAdr,
  yearsLegalExperience: initialYearsLegal,
  eligibility: initialEligibility,
}: QualificationProgressProps) {
  const [activeTab, setActiveTab] = useState<"arbitration" | "mediation">("arbitration");
  const [loading, setLoading] = useState(!initialTracks);
  const [data, setData] = useState<{
    tracks?: {
      arbitration: TrackProgress;
      mediation: TrackProgress;
    };
    yearsAdrExperience?: number;
    yearsLegalExperience?: number;
    eligibility?: {
      arbitration: {
        canTakePart1: boolean;
        canTakePart2: boolean;
        canApplyFellow: boolean;
        canUseExpedited: boolean;
      };
      mediation: {
        canTakeAssociate: boolean;
        canTakeMember: boolean;
        canApplyFellow: boolean;
      };
    };
  }>({
    tracks: initialTracks,
    yearsAdrExperience: initialYearsAdr,
    yearsLegalExperience: initialYearsLegal,
    eligibility: initialEligibility,
  });

  useEffect(() => {
    if (!initialTracks) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qualificationState, eligibilityData] = await Promise.all([
        getQualificationState(),
        getEligibility(),
      ]);

      if (qualificationState && eligibilityData) {
        setData({
          tracks: {
            arbitration: qualificationState.tracks?.arbitration,
            mediation: qualificationState.tracks?.mediation,
          },
          yearsAdrExperience: qualificationState.yearsAdrExperience,
          yearsLegalExperience: qualificationState.yearsLegalExperience,
          eligibility: {
            arbitration: {
              canTakePart1: eligibilityData.arbitration.canTakeAssociate,
              canTakePart2: eligibilityData.arbitration.canTakeMember,
              canApplyFellow: eligibilityData.arbitration.canApplyFellow,
              canUseExpedited: eligibilityData.arbitration.canUseExpedited || false,
            },
            mediation: eligibilityData.mediation,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching qualification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Qualification Pathway
          </CardTitle>
          <CardDescription>
            Track your progress through CIMA qualification tracks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const tracks = data.tracks;
  const yearsAdrExperience = data.yearsAdrExperience || 0;
  const yearsLegalExperience = data.yearsLegalExperience || 0;
  const eligibility = data.eligibility;

  if (!tracks || !eligibility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Qualification Pathway
          </CardTitle>
          <CardDescription>
            Track your progress through CIMA qualification tracks
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Qualification Pathway
        </CardTitle>
        <CardDescription>
          Track your progress through CIMA qualification tracks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Experience Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">ADR Experience</div>
            <div className="text-lg font-bold">{yearsAdrExperience} years</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Legal Experience</div>
            <div className="text-lg font-bold">{yearsLegalExperience} years</div>
          </div>
        </div>

        {/* Track Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "arbitration" | "mediation")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="arbitration" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Arbitration
            </TabsTrigger>
            <TabsTrigger value="mediation" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mediation
            </TabsTrigger>
          </TabsList>
          <TabsContent value="arbitration" className="mt-4">
            <TrackProgressCard
              track="ARBITRATION"
              progress={tracks.arbitration}
              eligibility={eligibility.arbitration}
            />
          </TabsContent>
          <TabsContent value="mediation" className="mt-4">
            <TrackProgressCard
              track="MEDIATION"
              progress={tracks.mediation}
              eligibility={eligibility.mediation}
            />
          </TabsContent>
        </Tabs>

        {/* View Full Pathway */}
        <div className="pt-4 border-t">
          <Link href="/qualification-pathway">
            <Button variant="ghost" className="w-full">
              View Full Qualification Pathway
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
