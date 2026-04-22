import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, Users, ArrowRight, X } from "lucide-react";

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  associate: { bg: "bg-[#888780]", text: "text-white" },
  member: { bg: "bg-[#185FA5]", text: "text-white" },
  fellow: { bg: "bg-destructive", text: "text-white" },
};

const LEVELS = ["associate", "member", "fellow"] as const;
const PART_LABELS: Record<string, string> = {
  associate: "Part I (Associate)",
  member: "Part II (Member)",
  fellow: "Part III (Fellow)",
};
const LEVEL_POST: Record<string, string> = { associate: "ACIMArb", member: "MCIMArb", fellow: "FCIMArb" };

function getLevelLabel(level: string | null): string {
  if (!level) return "Part I (Associate)";
  return PART_LABELS[level.toLowerCase()] || level;
}

export default function CourseBrowser() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");

  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["courses-browser", search, levelFilter],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*, instructor:users!courses_instructor_id_fkey(first_name, last_name)")
        .eq("is_published", true)
        .order("start_date", { ascending: true });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }
      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get enrollment counts per course
  const courseIds = courses.map((c: any) => c.id);
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["enrollment-counts", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const id of courseIds) {
        const { count } = await (supabase as any)
          .from("course_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", id)
          .neq("payment_status", "cancelled");
        counts[id] = count || 0;
      }
      return counts;
    },
    enabled: courseIds.length > 0,
  });

  const hasFilters = search || levelFilter !== "all" || formatFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Strip */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">All Courses</h1>
          <p className="text-primary-foreground/80">{courses.length} upcoming cohorts available</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="associate">Part I (Associate)</SelectItem>
                <SelectItem value="member">Part II (Member)</SelectItem>
                <SelectItem value="fellow">Part III (Fellow)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setLevelFilter("all"); setFormatFilter("all"); }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-40 w-full rounded-t-lg" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-2">No courses match your filters.</p>
              <p className="text-muted-foreground mb-6">Try removing a filter or check back soon.</p>
              {hasFilters && (
                <Button variant="outline" onClick={() => { setSearch(""); setLevelFilter("all"); setFormatFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => {
                const levelKey = (course.level || "associate").toLowerCase();
                const style = LEVEL_STYLES[levelKey] || LEVEL_STYLES.associate;
                const enrolled = (enrollmentCounts as any)[course.id] || 0;
                const capacity = course.total_capacity || 30;
                const spotsLeft = Math.max(0, capacity - enrolled);
                const isSoldOut = spotsLeft === 0;
                const levelLabel = getLevelLabel(course.level);

                return (
                  <Card key={course.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isSoldOut ? "opacity-75" : ""}`}>
                    {/* Banner */}
                    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className={`w-full h-full object-cover ${isSoldOut ? "grayscale" : ""}`} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      <Badge className={`absolute top-3 left-3 ${style.bg} ${style.text} border-0`}>
                        {levelLabel}
                      </Badge>
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">Sold Out</span>
                        </div>
                      )}
                      {course.cohort_id && (
                        <Badge variant="secondary" className="absolute top-3 right-3 bg-black/30 text-white border-0 text-xs">
                          {course.cohort_id}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-bold text-foreground leading-snug line-clamp-2">{course.title}</h3>
                      
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        {course.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              {new Date(course.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {course.end_date && ` – ${new Date(course.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                            </span>
                          </div>
                        )}
                        {course.venue && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="line-clamp-1">{course.venue}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-foreground">
                          {course.currency || "GHS"} {Number(course.price).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          {isSoldOut ? "Sold out" : `${spotsLeft} spots left`}
                        </div>
                      </div>

                      <Link href={`/course/${course.id}`}>
                        <Button variant={isSoldOut ? "secondary" : "default"} className="w-full">
                          {isSoldOut ? "Join Waitlist" : "View Course"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
