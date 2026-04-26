import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lock, 
  CheckCircle, 
  ArrowRight, 
  GraduationCap,
  Shield,
  Crown,
  ExternalLink,
  X
} from "lucide-react";
import { Link } from "wouter";

interface EnrollmentGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseLevel: "ASSOCIATE" | "MEMBER" | "FELLOW";
  userLevel: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  courseId?: string;
  courseTitle?: string;
  nextCourse?: {
    id: string;
    title: string;
    level: string;
  };
}

const LEVEL_ORDER = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];
const LEVEL_LABELS: Record<string, string> = {
  NONE: "No Level",
  STUDENT: "Student",
  ASSOCIATE: "Associate",
  MEMBER: "Member",
  FELLOW: "Fellow"
};

export default function EnrollmentGateModal({
  isOpen,
  onClose,
  courseLevel,
  userLevel = "NONE",
  courseId,
  courseTitle,
  nextCourse
}: EnrollmentGateModalProps) {
  const normalizedCourseLevel = courseLevel.toUpperCase();
  const normalizedUserLevel = userLevel.toUpperCase();
  
  const userIndex = LEVEL_ORDER.indexOf(normalizedUserLevel);
  const courseIndex = LEVEL_ORDER.indexOf(normalizedCourseLevel);
  
  const isBlocked = userIndex < courseIndex - 1;
  const isNextStep = userIndex === courseIndex - 1;
  
  const progressPercent = Math.min(
    ((userIndex + 1) / (courseIndex + 1)) * 100,
    100
  );

  const levelIcons = {
    NONE: Lock,
    STUDENT: GraduationCap,
    ASSOCIATE: Shield,
    MEMBER: Shield,
    FELLOW: Crown
  };

  const getLevelIcon = (level: string) => {
    return levelIcons[level as keyof typeof levelIcons] || Lock;
  };

  const CurrentLevelIcon = getLevelIcon(normalizedUserLevel);
  const TargetLevelIcon = getLevelIcon(normalizedCourseLevel);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              {isNextStep && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {isBlocked ? "Course Locked" : "Almost There!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {courseTitle && (
              <span className="block font-medium text-foreground mb-1">
                "{courseTitle}"
              </span>
            )}
            This course requires <Badge variant="secondary">{LEVEL_LABELS[normalizedCourseLevel]}</Badge> status
          </DialogDescription>
        </DialogHeader>

        {/* Progress ladder */}
        <div className="space-y-6 py-4">
          {/* Current position indicator */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Your Progress</span>
              <Badge variant="outline" className="font-medium">
                <CurrentLevelIcon className="w-3 h-3 mr-1" />
                {LEVEL_LABELS[normalizedUserLevel]}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{LEVEL_LABELS[normalizedUserLevel]}</span>
              <span>{LEVEL_LABELS[normalizedCourseLevel]}</span>
            </div>
          </div>

          {/* Steps to unlock */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">To unlock this course:</h4>
            
            {/* Completed steps */}
            {LEVEL_ORDER.slice(0, userIndex + 1).map((level, idx) => (
              <div 
                key={level} 
                className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-100"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <span className="font-medium text-green-800">{LEVEL_LABELS[level]}</span>
                  <span className="text-xs text-green-600 ml-2">Completed</span>
                </div>
              </div>
            ))}

            {/* Current/next step */}
            {isNextStep && nextCourse ? (
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {userIndex + 2}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-blue-900">{LEVEL_LABELS[LEVEL_ORDER[userIndex + 1]]}</span>
                  <span className="text-xs text-blue-600 ml-2">Next Step</span>
                </div>
                <Link href={`/course/${nextCourse.id}`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Start
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : isBlocked ? (
              LEVEL_ORDER.slice(userIndex + 1, courseIndex).map((level, idx) => (
                <div 
                  key={level} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    idx === 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    idx === 0 ? "bg-amber-500" : "bg-gray-400"
                  }`}>
                    {userIndex + idx + 2}
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${idx === 0 ? "text-amber-900" : "text-gray-600"}`}>
                      {LEVEL_LABELS[level]}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs text-amber-600 ml-2">Required Next</span>
                    )}
                  </div>
                  {idx === 0 && nextCourse ? (
                    <Link href={`/course/${nextCourse.id}`}>
                      <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                        View
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))
            ) : null}

            {/* Target level (locked) */}
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 border border-gray-200 opacity-60">
              <TargetLevelIcon className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-600">{LEVEL_LABELS[normalizedCourseLevel]}</span>
              <Lock className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
          </div>

          {/* Expedited path option */}
          {isBlocked && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h5 className="text-sm font-medium text-primary mb-1">Have prior ADR experience?</h5>
              <p className="text-xs text-muted-foreground mb-3">
                You may qualify for expedited membership through our assessment program.
              </p>
              <Link href="/qualification-pathway">
                <Button variant="outline" size="sm" className="w-full">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Check Expedited Options
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          {isNextStep && nextCourse ? (
            <Link href={`/course/${nextCourse.id}`} className="flex-1">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Start {LEVEL_LABELS[LEVEL_ORDER[userIndex + 1]]}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full">
                View My Progress
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
