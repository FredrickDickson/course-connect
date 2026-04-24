import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Star,
  Award,
  Zap,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Target,
  GraduationCap,
  Briefcase,
  Scale,
} from "lucide-react";
import { Link } from "wouter";
import type {
  PathwayOption,
  PathwayEligibilityMap,
} from "@/types/qualification";

interface PathwaySelectionProps {
  track: "ARBITRATION" | "MEDIATION";
  pathways: PathwayOption[];
  userLevel: string;
  eligibilityChecks: PathwayEligibilityMap;
}

export default function PathwaySelection({
  track,
  pathways,
  userLevel,
  eligibilityChecks,
}: PathwaySelectionProps) {
  const [selectedPathway, setSelectedPathway] = useState<PathwayOption | null>(null);
  const [showEligibilityDetails, setShowEligibilityDetails] = useState(false);

  const isArbitration = track === "ARBITRATION";
  const trackIcon = isArbitration ? Scale : Users;
  const trackColor = isArbitration ? "text-blue-600" : "text-green-600";

  // Separate pathways by type
  const standardPathways = pathways.filter(p => p.type === "STANDARD");
  const expeditedPathways = pathways.filter(p => p.type === "EXPEDITED");

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ASSOCIATE": return Shield;
      case "MEMBER": return Star;
      case "FELLOW": return Award;
      default: return Shield;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ASSOCIATE": return "text-blue-600";
      case "MEMBER": return "text-amber-600";
      case "FELLOW": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const PathwayCard = ({ pathway, isExpedited = false }: { pathway: PathwayOption; isExpedited?: boolean }) => {
    const LevelIcon = getLevelIcon(pathway.level);
    const levelColor = getLevelColor(pathway.level);
    
    return (
      <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
        isExpedited ? "border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50" : "border-border"
      } ${selectedPathway?.name === pathway.name ? "ring-2 ring-primary" : ""}`}>
        {pathway.isRecommended && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              Recommended
            </Badge>
          </div>
        )}
        
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full ${isExpedited ? "bg-amber-100" : "bg-primary/10"} flex items-center justify-center`}>
              {isExpedited ? (
                <Zap className={`w-5 h-5 text-amber-600`} />
              ) : (
                <LevelIcon className={`w-5 h-5 ${levelColor}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{pathway.name}</CardTitle>
                <Badge variant={isExpedited ? "secondary" : "default"} className={isExpedited ? "bg-amber-100 text-amber-800" : ""}>
                  {pathway.postNominal}
                </Badge>
              </div>
              <CardDescription className="mt-1">{pathway.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Information */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{pathway.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{pathway.format}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{pathway.assessment}</span>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Requirements</h4>
            <p className="text-sm text-muted-foreground">{pathway.eligibility}</p>
            {pathway.requirements && pathway.requirements.length > 0 && (
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                {pathway.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {req}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Modules (for detailed view) */}
          {pathway.modules && pathway.modules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Modules</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {pathway.modules.slice(0, 3).map((module, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    {module}
                  </div>
                ))}
                {pathway.modules.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{pathway.modules.length - 3} more modules</p>
                )}
              </div>
            </div>
          )}

          {/* Outcome */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium">Outcome:</span>
              <span className="text-muted-foreground">{pathway.outcome}</span>
            </div>
          </div>

          {/* Recommendation Reason */}
          {pathway.isRecommended && pathway.recommendationReason && (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                {pathway.recommendationReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Button
              className="w-full"
              variant={isExpedited ? "default" : "outline"}
              onClick={() => setSelectedPathway(pathway)}
            >
              {pathway.action === "enroll" && <BookOpen className="w-4 h-4 mr-2" />}
              {pathway.action === "apply" && <FileText className="w-4 h-4 mr-2" />}
              {pathway.action === "apply_expedited" && <Zap className="w-4 h-4 mr-2" />}
              {pathway.action === "enroll" && "Enroll Now"}
              {pathway.action === "apply" && "Apply for Fellowship"}
              {pathway.action === "apply_expedited" && "Apply via Expedited Route"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          {React.createElement(trackIcon, { className: `w-8 h-8 ${trackColor}` })}
          <h1 className="text-3xl font-bold">
            {isArbitration ? "Arbitration" : "Mediation"} Qualification Pathway
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose your path to professional certification. Select between structured learning or expedited assessment-based routes.
        </p>
        
        {/* Current Status */}
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            Current Level: {userLevel || "None"}
          </Badge>
          {isArbitration && (
            <Badge variant="outline" className="px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Expedited Available
            </Badge>
          )}
        </div>
      </div>

      {/* Smart Recommendations */}
      {standardPathways.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Recommended Learning Path</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Based on your profile, we recommend the structured learning path for comprehensive skill development.
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-blue-800">Step-by-step progression with expert guidance</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pathway Selection */}
      <div className="space-y-8">
        {/* Standard Training Path */}
        {standardPathways.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Structured Learning Path</h2>
              <Badge variant="secondary">Recommended</Badge>
            </div>
            <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {standardPathways.map((pathway) => (
                <PathwayCard key={pathway.name} pathway={pathway} />
              ))}
            </div>
          </div>
        )}

        {/* Expedited Routes - Only for Arbitration */}
        {isArbitration && expeditedPathways.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-amber-600" />
              <h2 className="text-2xl font-bold">Expedited Assessment Routes</h2>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Fast-Track
              </Badge>
            </div>
            
            {/* Eligibility Alert */}
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Important:</strong> Expedited routes are assessment-based admission workflows, not courses. 
                They require significant professional experience and qualifications. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-amber-800 underline ml-2"
                  onClick={() => setShowEligibilityDetails(!showEligibilityDetails)}
                >
                  {showEligibilityDetails ? "Hide" : "Show"} eligibility details
                </Button>
              </AlertDescription>
            </Alert>

            {/* Eligibility Details */}
            {showEligibilityDetails && (
              <Card className="mb-6 bg-slate-50 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Eligibility Requirements</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-amber-800 mb-2">Expedited Member (MCIMArb)</h4>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          LL.M degree holders
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Current ACIMArb members
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Legal professionals with 3+ years experience
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ADR professionals with 5+ years experience
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-800 mb-2">Expedited Fellow (FCIMArb)</h4>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Must be MCIMArb or equivalent
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          7+ years ADR experience OR 10+ years legal experience
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Proven award-writing skills
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Professional portfolio recommended
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
              {expeditedPathways.map((pathway) => (
                <PathwayCard key={pathway.name} pathway={pathway} isExpedited />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Need Help Section */}
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Not sure which path to choose?</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Our academic advisors can help you select the best pathway based on your experience and career goals.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Download Guide
            </Button>
            <Button>
              <Users className="w-4 h-4 mr-2" />
              Speak to Advisor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
