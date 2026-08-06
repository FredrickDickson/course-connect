import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, GraduationCap, PlayCircle } from "lucide-react";

interface AdjunctEnrollment {
  id: string;
  progress: string | number;
  course: {
    id: string;
    title: string;
  } | null;
}

interface AdjunctCertification {
  id: string;
  course: {
    id: string;
    title: string;
  } | null;
}

interface Props {
  enrollments: AdjunctEnrollment[];
  certifications: AdjunctCertification[];
}

export default function AdjunctCoursesPanel({ enrollments, certifications }: Props) {
  const completedCourseIds = new Set(certifications.map((c) => c.course?.id).filter(Boolean));
  const inProgress = enrollments.filter((e) => !completedCourseIds.has(e.course?.id));

  if (enrollments.length === 0 && certifications.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-4 h-4" /> Adjunct Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Standalone courses like "AI for Lawyers" or "Legal Drafting" - no prerequisites, just a Certificate of Completion.
          </p>
          <Link href="/course-catalog?type=adjunct">
            <Button size="sm" variant="outline">Browse Adjunct Courses</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="w-4 h-4" /> Adjunct Courses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {inProgress.map((e) => (
          <div key={e.id} className="p-2 rounded-lg border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate">{e.course?.title}</span>
              <Link href={`/learn/${e.course?.id}`}>
                <Button size="sm" variant="ghost" className="h-7 px-2">
                  <PlayCircle className="w-3.5 h-3.5 mr-1" /> Continue
                </Button>
              </Link>
            </div>
            <Progress value={Number(e.progress) || 0} className="h-1.5" />
          </div>
        ))}
        {certifications.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
            <span className="text-sm font-medium truncate">{c.course?.title}</span>
            <Link href={`/certificates/completion/${c.id}`}>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Download className="w-3.5 h-3.5 mr-1" /> Certificate
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
