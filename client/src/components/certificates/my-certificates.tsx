import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Lock, GraduationCap } from "lucide-react";
import CertificatePreviewModal from "@/components/dashboard/certificate-preview-modal";
import type { CertificateData } from "@/lib/certificate-generator";
import { PATHWAY_TYPES, type PathwayType } from "../../../../shared/pathways";

interface CourseRow {
  id: string;
  title: string;
  level: string | null;
  track: string | null;
}

interface EnrollmentRow {
  course_id: string;
  enrolled_at: string | null;
  completed_at: string | null;
  course: CourseRow | CourseRow[] | null;
}

function normaliseLevel(level?: string | null): "associate" | "member" | "fellow" {
  const l = (level || "").toLowerCase();
  if (l.includes("fellow")) return "fellow";
  if (l.includes("member")) return "member";
  return "associate";
}

function normalisePathway(track?: string | null): PathwayType {
  return (track || "").toLowerCase().includes("med")
    ? PATHWAY_TYPES.MEDIATION
    : PATHWAY_TYPES.ARBITRATION;
}

export default function MyCertificates() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<CertificateData | null>(null);

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentRow[]>({
    queryKey: ["my-cert-enrollments", user?.id],
    enabled: !!user?.id && isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, completed_at, course:courses(id, title, level, track)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as EnrollmentRow[];
    },
  });

  const courseIds = useMemo(
    () => enrollments.map((e) => e.course_id).filter(Boolean),
    [enrollments],
  );

  const { data: lessonsByCourse = {} } = useQuery<Record<string, string[]>>({
    queryKey: ["my-cert-lessons", courseIds.join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, module:modules!inner(course_id)")
        .in("module.course_id", courseIds);
      if (error) throw error;
      const byCourse: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        const cid = Array.isArray(row.module) ? row.module[0]?.course_id : row.module?.course_id;
        if (!cid) return;
        (byCourse[cid] ||= []).push(row.id);
      });
      return byCourse;
    },
  });

  const allLessonIds = useMemo(
    () => Object.values(lessonsByCourse).flat(),
    [lessonsByCourse],
  );

  const { data: completedSet = new Set<string>() } = useQuery<Set<string>>({
    queryKey: ["my-cert-progress", user?.id, allLessonIds.length],
    enabled: !!user?.id && allLessonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id)
        .in("lesson_id", allLessonIds);
      if (error) throw error;
      return new Set((data || []).filter((r: any) => r.completed).map((r: any) => r.lesson_id));
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-cert-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("first_name, middle_name, last_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!isAuthenticated || isLoading || enrollments.length === 0) return null;

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Member";

  const items = enrollments.map((en) => {
    const course = (Array.isArray(en.course) ? en.course[0] : en.course) as CourseRow | null;
    const ids = lessonsByCourse[en.course_id] || [];
    const total = ids.length;
    const done = ids.filter((id) => completedSet.has(id)).length;
    return { en, course, total, done };
  });

  const openPreview = async (course: CourseRow, completedAt: string) => {
    // Best-effort: record issuance so admins can audit. Ignore failures (e.g., unique conflict).
    try {
      await supabase.from("certificates").upsert(
        {
          user_id: user!.id,
          track: (course.track || "ARBITRATION").toUpperCase(),
          level: (course.level || "associate").toUpperCase(),
          pathway: "STANDARD",
          post_nominal: "",
          certificate_number: `${course.id.slice(0, 8).toUpperCase()}-${user!.id.slice(0, 6).toUpperCase()}`,
          issued_at: completedAt,
        },
        { onConflict: "user_id,track,level" } as any,
      );
    } catch {
      // Non-fatal
    }
    setActive({
      fullName,
      membershipLevel: normaliseLevel(course.level),
      memberId: `${course.id.slice(0, 8).toUpperCase()}`,
      issueDate: completedAt,
      expiryDate: new Date(new Date(completedAt).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      pathway: normalisePathway(course.track),
    });
    setOpen(true);
  };

  return (
    <section className="space-y-6" data-testid="my-certificates">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">My Certificates</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(({ en, course, total, done }) => {
          if (!course) return null;
          const completed = total > 0 && done === total;
          const issuedAt = en.completed_at || new Date().toISOString();
          return (
            <Card key={en.course_id} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      {course.level && <Badge variant="secondary">{course.level}</Badge>}
                      {course.track && <Badge variant="outline">{course.track}</Badge>}
                    </div>
                  </div>
                  {completed ? (
                    <Badge className="bg-primary text-primary-foreground">Earned</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{done} of {total} lessons complete</span>
                    <span>{total ? Math.round((done / total) * 100) : 0}%</span>
                  </div>
                  <Progress value={total ? (done / total) * 100 : 0} />
                </div>
                {completed ? (
                  <Button
                    className="w-full"
                    onClick={() => openPreview(course, issuedAt)}
                    data-testid={`button-preview-cert-${course.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" /> Preview Certificate
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Lock className="h-4 w-4 mr-2" /> Finish all lessons to unlock
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {active && (
        <CertificatePreviewModal open={open} onOpenChange={setOpen} data={active} />
      )}
    </section>
  );
}
