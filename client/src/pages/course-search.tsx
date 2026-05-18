import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link, useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, Users, ArrowRight, X, Star, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCoursePrice } from "@/lib/format-price";
import CourseCardStatus, { getCourseStatus, type CourseStatus } from "@/components/course-card-status";
import EnrollmentGateModal from "@/components/enrollment-gate-modal";
import { 
  PATHWAY_TYPES, 
  detectCoursePathway,
  getPathwayConfig,
  type PathwayType 
} from "../../../shared/pathways";

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

export default function CourseSearch() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState<"all" | "ARBITRATION" | "MEDIATION">("all");
  const [pathwayFilter, setPathwayFilter] = useState<PathwayType | "all">("all");
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDuration, setMaxDuration] = useState(100);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLockedCourse, setSelectedLockedCourse] = useState<any>(null);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);

  // Get user's effective level
  const userLevel = (user?.assignedLevel || user?.currentLevel || "NONE").toUpperCase() as "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";

  // Fetch user's track progress
  const { data: trackProgress = {} } = useQuery({
    queryKey: ["track-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await (supabase as any)
        .from("track_progress")
        .select("track, level")
        .eq("user_id", user.id);
      if (error) throw error;
      const progress: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        progress[row.track] = row.level || "NONE";
      });
      return progress;
    },
    enabled: !!user?.id,
  });

  // Parse URL params for initial filters
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const searchParam = params.get("search");
    const categoryParam = params.get("category");
    if (searchParam) setSearch(searchParam);
    if (categoryParam) setCategoryFilter(categoryParam);
  }, [location]);

  // Fetch categories
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Eligibility checking helper
  const checkCourseEligibility = (course: any): { status: "eligible" | "upgrade-required" | "enrolled" | "unknown"; label: string } => {
    if (!user?.id) return { status: "unknown", label: "Sign in to check" };
    
    const courseTrack = course.track || "ARBITRATION";
    const userTrackLevel = trackProgress[courseTrack] || "NONE";
    const courseLevel = (course.level || "associate").toUpperCase();
    
    const LEVEL_ORDER = { NONE: 0, ASSOCIATE: 1, MEMBER: 2, FELLOW: 3 };
    const userIndex = LEVEL_ORDER[userTrackLevel as keyof typeof LEVEL_ORDER] || 0;
    const courseIndex = LEVEL_ORDER[courseLevel as keyof typeof LEVEL_ORDER] || 1;
    
    // Check if enrolled
    const isEnrolled = userEnrollments.some(
      (e: any) => e.course_id === course.id && e.status === "ACTIVE"
    );
    if (isEnrolled) return { status: "enrolled", label: "Enrolled" };
    
    // Anyone can take Associate
    if (courseLevel === "ASSOCIATE") {
      return { status: "eligible", label: "Eligible" };
    }
    
    // Must have completed previous level
    if (userIndex >= courseIndex - 1) {
      return { status: "eligible", label: "Eligible" };
    }
    
    // Show what level is needed
    const requiredLevel = courseIndex === 2 ? "Associate" : "Member";
    return { status: "upgrade-required", label: `Requires ${requiredLevel}` };
  };

  // Fetch courses with filters
  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["courses-search", search, levelFilter, categoryFilter, trackFilter, pathwayFilter, showEligibleOnly, minRating, maxDuration, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*, instructor:users!courses_instructor_id_fkey(first_name, last_name)")
        .eq("is_published", true)
        .order("start_date", { ascending: true });

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,subtitle.ilike.%${search}%`);
      }
      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }
      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }
      if (trackFilter !== "all") {
        query = query.eq("track", trackFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply client-side filters
      let filteredData = data || [];

      // Pathway filter
      if (pathwayFilter !== "all") {
        filteredData = filteredData.filter(course => {
          const coursePathway = detectCoursePathway({
            title: course.title,
            tags: course.tags || []
          });
          return coursePathway === pathwayFilter;
        });
      }

      // Filter by eligibility if toggle is on
      if (showEligibleOnly && user?.id) {
        filteredData = filteredData.filter(course => {
          const eligibility = checkCourseEligibility(course);
          return eligibility.status === "eligible";
        });
      }

      // Rating filter
      if (minRating > 0) {
        filteredData = filteredData.filter(course => (course.avg_rating || 0) >= minRating);
      }

      // Duration filter
      if (maxDuration < 100) {
        filteredData = filteredData.filter(course => {
          const duration = course.duration_hours || 0;
          return duration <= maxDuration;
        });
      }

      // Price range filter
      filteredData = filteredData.filter(course => {
        const price = Number(course.price) || 0;
        return price >= priceRange[0] && price <= priceRange[1];
      });

      // Sort by eligibility: eligible first, then upgrade-required, then enrolled
      if (user?.id) {
        filteredData.sort((a: any, b: any) => {
          const aElig = checkCourseEligibility(a);
          const bElig = checkCourseEligibility(b);
          
          const priority = { eligible: 0, "upgrade-required": 1, enrolled: 2, unknown: 3 };
          return priority[aElig.status as keyof typeof priority] - priority[bElig.status as keyof typeof priority];
        });
      }

      return filteredData;
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

  // Fetch user's existing enrollments
  const { data: userEnrollments = [] } = useQuery({
    queryKey: ["user-enrollments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, status")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const hasFilters = search || levelFilter !== "all" || categoryFilter !== "all" || pathwayFilter !== "all" || minRating > 0 || maxDuration < 100 || priceRange[0] > 0 || priceRange[1] < 10000;

  // Check if user is enrolled in a course
  const isEnrolled = (courseId: string) => {
    return userEnrollments.some(e => e.course_id === courseId && e.status === 'ACTIVE');
  };

  // Get next course for progression
  const getNextCourse = (currentLevel: string) => {
    const levelOrder = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];
    const currentIndex = levelOrder.indexOf(currentLevel.toUpperCase());
    const nextLevel = levelOrder[currentIndex + 1];
    
    return courses.find(c => c.level?.toUpperCase() === nextLevel);
  };

  const categories = ["all", ...categoriesData.map((cat: any) => cat.id)];
  const categoryNames = {
    all: "All Categories",
    ...Object.fromEntries(categoriesData.map((cat: any) => [cat.id, cat.name])),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Strip */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Course Catalog</h1>
          <p className="text-primary-foreground/80">{courses.length} courses available</p>
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="associate">Part I (Associate)</SelectItem>
                <SelectItem value="member">Part II (Member)</SelectItem>
                <SelectItem value="fellow">Part III (Fellow)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryNames[category] || category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trackFilter} onValueChange={(value: any) => setTrackFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                <SelectItem value="ARBITRATION">Arbitration</SelectItem>
                <SelectItem value="MEDIATION">Mediation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pathwayFilter} onValueChange={setPathwayFilter as (value: string) => void}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pathway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pathways</SelectItem>
                <SelectItem value={PATHWAY_TYPES.ARBITRATION}>Arbitration (ACIMArb)</SelectItem>
                <SelectItem value={PATHWAY_TYPES.MEDIATION}>Mediation (ACIMed)</SelectItem>
              </SelectContent>
            </Select>
            {user && (
              <Button
                variant={showEligibleOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEligibleOnly(!showEligibleOnly)}
              >
                {showEligibleOnly ? "All Courses" : "Eligible Only"}
              </Button>
            )}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearch("");
                setLevelFilter("all");
                setCategoryFilter("all");
                setTrackFilter("all");
                setPathwayFilter("all");
                setShowEligibleOnly(false);
                setMinRating(0);
                setMaxDuration(100);
                setPriceRange([0, 10000]);
              }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Advanced Filters */}
      {/* {showAdvancedFilters && (
        <section className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Rating Filter */}
              {/* <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Minimum Rating
                  </label>
                  <span className="text-sm text-muted-foreground">{minRating > 0 ? `${minRating}+ stars` : "Any"}</span>
                </div>
                <div className="flex gap-2">
                  {[0, 3, 3.5, 4, 4.5].map((rating) => (
                    <Button
                      key={rating}
                      variant={minRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMinRating(rating)}
                      className="flex-1"
                    >
                      {rating === 0 ? "Any" : `${rating}+`}
                    </Button>
                  ))}
                </div>
              </div> */}

              {/* Duration Filter */}
              {/* <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Maximum Duration</label>
                  <span className="text-sm text-muted-foreground">{maxDuration < 100 ? `${maxDuration} hours` : "Any"}</span>
                </div>
                <Slider
                  value={[maxDuration]}
                  onValueChange={(value) => setMaxDuration(value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0h</span>
                  <span>100h</span>
                </div>
              </div> */}

              {/* Price Range Filter */}
              {/* <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Price Range</label>
                  <span className="text-sm text-muted-foreground">
                    {priceRange[0] === 0 && priceRange[1] === 10000 ? "Any" : `GHS ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}`}
                  </span>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={10000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>GHS 0</span>
                  <span>GHS 10,000</span>
                </div>
              </div> */}
            {/* </div>
          </div>
        </section>
      )} */}

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
                <Button variant="outline" onClick={() => {
                  setSearch("");
                  setLevelFilter("all");
                  setCategoryFilter("all");
                  setPathwayFilter("all");
                  setMinRating(0);
                  setMaxDuration(100);
                  setPriceRange([0, 10000]);
                }}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => {
                const eligibility = checkCourseEligibility(course);
                const status: CourseStatus = eligibility.status === "enrolled" 
                  ? "ENROLLED" 
                  : eligibility.status === "eligible"
                  ? "AVAILABLE"
                  : "LOCKED";
                
                // If user is authenticated, use CourseCardStatus with enrollment gate
                if (user) {
                  return (
                    <CourseCardStatus 
                      key={course.id} 
                      course={course} 
                      userLevel={userLevel}
                      status={status}
                      eligibility={eligibility}
                      onLockedClick={() => {
                        setSelectedLockedCourse(course);
                        setIsGateModalOpen(true);
                      }}
                    />
                  );
                }

                // If user is not authenticated, use simple card display
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
                          {formatCoursePrice(course.price, course.currency || "GHS")}
                        </span>
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
      
      {/* Enrollment Gate Modal */}
      <EnrollmentGateModal
        isOpen={isGateModalOpen}
        onClose={() => {
          setIsGateModalOpen(false);
          setSelectedLockedCourse(null);
        }}
        courseLevel={(selectedLockedCourse?.level || "ASSOCIATE").toUpperCase()}
        userLevel={userLevel}
        courseId={selectedLockedCourse?.id}
        courseTitle={selectedLockedCourse?.title}
        courseTrack={selectedLockedCourse?.track as "ARBITRATION" | "MEDIATION"}
        nextCourse={getNextCourse(userLevel) ? {
          id: getNextCourse(userLevel)!.id,
          title: getNextCourse(userLevel)!.title,
          level: getNextCourse(userLevel)!.level,
          track: getNextCourse(userLevel)!.track
        } : undefined}
      />
    </div>
  );
}
