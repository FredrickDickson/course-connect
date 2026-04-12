import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Play, RotateCcw } from "lucide-react";
import { Link } from "wouter";

interface Enrollment {
  id: string;
  progress: number | null;
  enrolled_at: string;
  course?: {
    id: string;
    title: string;
    subtitle?: string;
    thumbnail_url?: string;
    duration_hours?: number;
    level?: string;
  };
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=250&fit=crop";

export default function EnrolledCoursesGrid({
  enrollments,
  isLoading,
}: {
  enrollments: Enrollment[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="h-36 bg-muted rounded-t-lg" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GraduationCap className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No courses yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Start your ADR journey by enrolling in your first course.</p>
          <Link href="/course-catalog">
            <Button>Explore Courses</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {enrollments.map((e) => {
        const pct = Number(e.progress || 0);
        const done = pct >= 100;
        return (
          <Card key={e.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={e.course?.thumbnail_url || FALLBACK_IMG}
                  alt={e.course?.title}
                  className="w-full h-36 object-cover"
                />
                {/* Overlay play button */}
                <Link href={`/course/${e.course?.id}`}>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                      {done ? <RotateCcw className="h-5 w-5 text-primary" /> : <Play className="h-5 w-5 text-primary" />}
                    </div>
                  </div>
                </Link>
                {e.course?.level && (
                  <Badge className="absolute top-2 right-2 text-[10px] capitalize" variant="secondary">
                    {e.course.level}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-sm line-clamp-2 mb-1">{e.course?.title}</h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{e.course?.duration_hours ? `${e.course.duration_hours}h` : ""}</span>
                  <span className={done ? "text-green-600 font-semibold" : ""}>{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
