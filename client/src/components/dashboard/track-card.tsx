import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, GraduationCap } from "lucide-react";

interface TrackCardProps {
  track: "ARBITRATION" | "MEDIATION";
  level: string;
  pathway: string | null;
  certificates: any[];
  enrollments: any[];
  color: string;
}

const trackColors = {
  ARBITRATION: { primary: "#1e40af", secondary: "#3b82f6", bg: "bg-blue-50", border: "border-blue-200" },
  MEDIATION: { primary: "#059669", secondary: "#10b981", bg: "bg-green-50", border: "border-green-200" },
};

const levelLabels: Record<string, string> = {
  NONE: "No Level",
  STUDENT: "Student",
  ASSOCIATE: "Associate",
  MEMBER: "Member",
  FELLOW: "Fellow",
};

const postNominals: Record<string, Record<string, string>> = {
  ARBITRATION: {
    ASSOCIATE: "ACIMArb",
    MEMBER: "MCIMArb",
    FELLOW: "FCIMArb",
  },
  MEDIATION: {
    ASSOCIATE: "ACIMed",
    MEMBER: "MCIMed",
    FELLOW: "FCIMed",
  },
};

export function TrackCard({ track, level, pathway, certificates, enrollments, color }: TrackCardProps) {
  const colors = trackColors[track];
  const postNominal = postNominals[track][level] || "";
  const completedEnrollments = enrollments.filter(
    (e: any) => e.status === "COMPLETED" || Number(e.progress) >= 100,
  );
  const activeEnrollments = enrollments.filter(
    (e: any) => Number(e.progress) > 0 && Number(e.progress) < 100,
  );

  return (
    <Card className={`${colors.bg} ${colors.border} border`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg" style={{ color: colors.primary }}>
            {track} Track
          </CardTitle>
          <div
            className="px-3 py-1 rounded-full text-white text-xs sm:text-sm font-semibold"
            style={{ backgroundColor: colors.primary }}
          >
            {levelLabels[level] || level}
          </div>
        </div>
        {postNominal && (
          <p className="text-sm font-semibold mt-1" style={{ color: colors.secondary }}>
            {postNominal}
          </p>
        )}
        {pathway && (
          <p className="text-xs text-muted-foreground mt-1">
            Pathway: {pathway}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-white/50">
            <BookOpen className="w-4 h-4 mx-auto mb-1" style={{ color: colors.primary }} />
            <div className="text-lg font-bold">{enrollments.length}</div>
            <div className="text-[10px] text-muted-foreground">Enrolled</div>
          </div>
          <div className="text-center p-2 rounded bg-white/50">
            <GraduationCap className="w-4 h-4 mx-auto mb-1" style={{ color: colors.primary }} />
            <div className="text-lg font-bold">{completedEnrollments.length}</div>
            <div className="text-[10px] text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-2 rounded bg-white/50">
            <Award className="w-4 h-4 mx-auto mb-1" style={{ color: colors.primary }} />
            <div className="text-lg font-bold">{certificates.length}</div>
            <div className="text-[10px] text-muted-foreground">Certs</div>
          </div>
        </div>

        {/* Active Course */}
        {activeEnrollments.length > 0 && (
          <div className="p-3 rounded bg-white/50 border border-gray-200">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Currently Learning</p>
            <p className="text-sm font-medium truncate">
              {activeEnrollments[0].course?.title || activeEnrollments[0].courses?.title}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Number(activeEnrollments[0].progress) || 0}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(Number(activeEnrollments[0].progress) || 0)}% complete
            </p>
          </div>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Certificates</p>
            <div className="space-y-2">
              {certificates.map((cert: any) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-2 p-2 rounded bg-white/50 border border-gray-200"
                >
                  <Award className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cert.level}</p>
                    <p className="text-[10px] text-muted-foreground">{cert.post_nominal}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {certificates.length === 0 && activeEnrollments.length === 0 && (
          <div className="text-center py-4">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Start your {track.toLowerCase()} journey by enrolling in a course
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
