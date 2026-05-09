import CourseCardStatus, { type CourseStatus } from "@/components/course-card-status";
import { GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    price?: string;
    currency?: string;
    avg_rating?: string;
    rating_count?: number;
    enrollment_count?: number;
    category?: { name: string };
    instructor?: { first_name?: string; last_name?: string };
    tags?: string[];
  };
}

export default function EnrolledCoursesGrid({
  enrollments,
  isLoading,
}: {
  enrollments: Enrollment[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {enrollments.map((e) => {
        const pct = Number(e.progress || 0);
        const done = pct >= 100;
        
        // Transform enrollment data to match CourseCardStatus props
        const courseData = {
          id: e.course?.id || "",
          title: e.course?.title || "",
          subtitle: e.course?.subtitle,
          thumbnail_url: e.course?.thumbnail_url,
          duration_hours: e.course?.duration_hours,
          level: e.course?.level || "associate",
          price: e.course?.price || "0",
          currency: e.course?.currency || "USD",
          avg_rating: e.course?.avg_rating || "0",
          rating_count: e.course?.rating_count || 0,
          enrollment_count: e.course?.enrollment_count || 0,
          category: e.course?.category,
          instructor: e.course?.instructor,
          tags: e.course?.tags,
        };

        return (
          <CourseCardStatus
            key={e.id}
            course={courseData}
            userLevel="NONE"
            status="ENROLLED"
          />
        );
      })}
    </div>
  );
}
