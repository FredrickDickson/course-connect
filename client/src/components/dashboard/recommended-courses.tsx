import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function RecommendedCourses({ enrolledCourseIds }: { enrolledCourseIds: string[] }) {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["recommended-courses", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id, title, thumbnail_url, level, price, currency, duration_hours")
        .eq("is_published", true)
        .order("enrollment_count", { ascending: false })
        .limit(4);

      const { data, error } = await query;
      if (error) throw error;
      // filter out already-enrolled client-side
      return (data || []).filter((c: any) => !enrolledCourseIds.includes(c.id));
    },
    enabled: !!user,
  });

  if (courses.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-500" /> Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.slice(0, 3).map((c: any) => (
          <Link key={c.id} href={`/course/${c.id}`}>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <img
                src={c.thumbnail_url || "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=80&h=80&fit=crop"}
                alt={c.title}
                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium line-clamp-1">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.level && <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">{c.level}</Badge>}
                  {c.duration_hours && <span className="text-[10px] text-muted-foreground">{c.duration_hours}h</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
        <Link href="/course-catalog">
          <Button variant="outline" size="sm" className="w-full mt-1">Browse All Courses</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
