import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Heart,
  BookOpen,
  Clock,
  Star,
  Users,
  X,
} from "lucide-react";
import { Link } from "wouter";

interface Suggestion {
  type: "course" | "category";
  id: string;
  title: string;
  subtitle?: string | null;
  url: string;
}

export default function Courses() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "ARBITRATION" | "MEDIATION">("all");
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Autocomplete suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ["search-suggestions", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const [coursesResult, categoriesResult] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, subtitle")
          .eq("is_published", true)
          .ilike("title", `%${search}%`)
          .limit(5),
        supabase
          .from("categories")
          .select("id, name")
          .ilike("name", `%${search}%`)
          .limit(3),
      ]);

      const courseSuggestions: Suggestion[] = (coursesResult.data || []).map(c => ({
        type: "course",
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        url: `/course/${c.id}`,
      }));

      const categorySuggestions: Suggestion[] = (categoriesResult.data || []).map(c => ({
        type: "category",
        id: c.id,
        title: c.name,
        url: `/courses?category=${c.id}`,
      }));

      return [...courseSuggestions, ...categorySuggestions];
    },
    enabled: search.length >= 2,
  });

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setShowAutocomplete(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearch(suggestion.title);
    setShowAutocomplete(false);
    window.location.href = suggestion.url;
  };

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

  const { data: courses = [], isLoading } = useQuery({
    queryKey: [
      "courses_filtered",
      {
        search,
        category: category === "all" ? "" : category,
        level: level === "all" ? "" : level,
        trackFilter,
        showEligibleOnly,
        sortBy,
        priceRange: priceRange === "all" ? "" : priceRange,
      },
    ],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(
          "*, category:categories(*), instructor:users!courses_instructor_id_fkey(first_name, last_name)",
        )
        .eq("is_published", true);

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (category && category !== "all") {
        // If it's a slug, we might need a join or a second query.
        // Assuming we have slugs in categories table.
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", category)
          .maybeSingle();
        if (catData) query = query.eq("category_id", (catData as any).id);
      }

      if (level && level !== "all") {
        query = query.eq("level", level);
      }

      if (trackFilter !== "all") {
        query = query.eq("track", trackFilter);
      }

      // Sort logic
      if (sortBy === "newest")
        query = query.order("created_at", { ascending: false });
      else if (sortBy === "price-low")
        query = query.order("price", { ascending: true });
      else if (sortBy === "price-high")
        query = query.order("price", { ascending: false });
      else if (sortBy === "rating")
        query = query.order("avg_rating", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filter by eligibility if toggle is on
      if (showEligibleOnly && user?.id) {
        filteredData = filteredData.filter(course => {
          const eligibility = checkCourseEligibility(course);
          return eligibility.status === "eligible";
        });
      }
      
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

  const { data: stats } = useQuery({
    queryKey: ["courses_stats"],
    queryFn: async () => {
      const { count } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);
      return { totalCourses: count || 0 };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                <BookOpen className="w-4 h-4 mr-2" />
                {stats?.totalCourses || "50+"} Professional Courses
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                {t("courses.title")}
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
                {t("courses.subtitle")}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-8 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-yellow-300" />
                <span>5,000+ Global Members</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-300" />
                <span>4.8 Average Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-300" />
                <span>International Recognition</span>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-yellow-300" />
                <span>6 Professional Courses</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Search & Filters */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar with Autocomplete */}
          <div className="relative max-w-2xl mx-auto mb-8" ref={searchContainerRef}>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
            <Input
              data-testid="input-search"
              type="text"
              placeholder="Search courses, topics, or instructors..."
              className="pl-12 pr-10 py-3 text-lg border-0 bg-white shadow-md rounded-xl focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => search.length >= 2 && setShowAutocomplete(true)}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setShowAutocomplete(false);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {showAutocomplete && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.id}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="mt-0.5 text-muted-foreground">
                      {suggestion.type === "course" ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <Filter className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{suggestion.title}</p>
                      {suggestion.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{suggestion.subtitle}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            {/* Left Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <Select onValueChange={setCategory} data-testid="select-category">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.slug || cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={setLevel} data-testid="select-level">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="associate">Part I (Associate)</SelectItem>
                  <SelectItem value="member">Part II (Member)</SelectItem>
                  <SelectItem value="fellow">Part III (Fellow)</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value: any) => setTrackFilter(value)} value={trackFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Track" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks</SelectItem>
                  <SelectItem value="ARBITRATION">Arbitration</SelectItem>
                  <SelectItem value="MEDIATION">Mediation</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setPriceRange} data-testid="select-price">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-1000">Under $1,000</SelectItem>
                  <SelectItem value="1000-2000">$1,000 - $2,000</SelectItem>
                  <SelectItem value="2000-3000">$2,000 - $3,000</SelectItem>
                  <SelectItem value="3000+">$3,000+</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setSortBy} data-testid="select-sort">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Eligibility Toggle */}
            {user && (
              <Button
                variant={showEligibleOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEligibleOnly(!showEligibleOnly)}
              >
                {showEligibleOnly ? "All Courses" : "Eligible Only"}
              </Button>
            )}

            {/* Right View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(search || category || level || priceRange) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{search}"
                  <button
                    onClick={() => {
                      setSearch("");
                      setShowAutocomplete(false);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category:{" "}
                  {categories.find((c: any) => c.slug === category)?.name ||
                    category}
                  <button
                    onClick={() => setCategory("")}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {level && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Level: {level}
                  <button
                    onClick={() => setLevel("")}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {priceRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Price: {priceRange === "free" ? "Free" : `$${priceRange}`}
                  <button
                    onClick={() => setPriceRange("")}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setShowAutocomplete(false);
                  setCategory("all");
                  setLevel("all");
                  setPriceRange("all");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="hidden md:block py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Featured Professional Courses
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Internationally recognized courses designed by leading ADR experts
              and practitioners
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Highlight top courses */}
            {courses
              .filter((course: any) => course.is_featured)
              .slice(0, 2)
              .map((course: any) => (
                <Link key={course.id} href={`/course/${course.id}`}>
                <Card
                  className="overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant="secondary"
                        className="bg-black/20 text-white border-0"
                      >
                        {course.level}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {course.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-foreground">
                            ${course.price.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {course.duration_hours} hours
                          </div>
                        </div>
                        <Button>Learn More</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Header */}
          {!isLoading && (
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {courses.length === 0
                    ? "No courses found"
                    : "Available Courses"}
                </h2>
                <p
                  className="text-muted-foreground mt-1"
                  data-testid="results-count"
                >
                  {courses.length > 0 &&
                    `${courses.length} course${courses.length !== 1 ? "s" : ""} available`}
                </p>
              </div>

              {courses.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {Math.min(courses.length, 12)} of {courses.length}{" "}
                    results
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "space-y-6"
              }
            >
              {[...Array(6)].map((_, i) => (
                <Card
                  key={i}
                  className="animate-pulse"
                  data-testid={`skeleton-course-${i}`}
                >
                  {viewMode === "grid" ? (
                    <>
                      <div className="w-full h-48 bg-muted"></div>
                      <CardContent className="p-6 space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-10 bg-muted rounded"></div>
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="p-6">
                      <div className="flex space-x-4">
                        <div className="w-24 h-16 bg-muted rounded flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-8 bg-muted rounded w-24"></div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && courses.length === 0 && (
            <div className="text-center py-16" data-testid="empty-state">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No courses found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any courses matching your criteria. Try
                adjusting your filters or search terms.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setShowAutocomplete(false);
                    setCategory("");
                    setLevel("");
                    setPriceRange("");
                  }}
                >
                  Clear all filters
                </Button>
                <Button asChild>
                  <a href="/courses">Browse all courses</a>
                </Button>
              </div>
            </div>
          )}

          {/* Course Results */}
          {!isLoading && courses.length > 0 && (
            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "space-y-6"
              }
            >
              {courses.map((course: any) => {
                const eligibility = checkCourseEligibility(course);
                
                return viewMode === "grid" ? (
                  <CourseCard key={course.id} course={course} eligibility={eligibility} />
                ) : (
                  <Card
                    key={course.id}
                    className="hover:shadow-lg transition-all duration-300 group"
                  >
                    <CardContent className="p-6">
                      <div className="flex space-x-4">
                        <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                                  {course.title}
                                </h3>
                                {eligibility.status !== "unknown" && (
                                  <Badge
                                    variant={
                                      eligibility.status === "eligible"
                                        ? "default"
                                        : eligibility.status === "enrolled"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={
                                      eligibility.status === "eligible"
                                        ? "bg-green-500 text-white"
                                        : eligibility.status === "enrolled"
                                        ? "bg-blue-500 text-white"
                                        : ""
                                    }
                                  >
                                    {eligibility.label}
                                  </Badge>
                                )}
                              </div>
                              {course.subtitle && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {course.subtitle}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                                  <span>
                                    {course.avg_rating?.toFixed(1) || "0.0"}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="w-4 h-4" />
                                  <span>{course.enrollment_count || 0}</span>
                                </div>
                                {course.duration_hours && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{course.duration_hours}h</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2 ml-4">
                              <div className="text-lg font-bold text-primary">
                                {course.price &&
                                parseFloat(course.price.toString()) > 0
                                  ? `$${parseFloat(course.price.toString()).toFixed(2)}`
                                  : "Free"}
                              </div>
                              <Button size="sm" asChild>
                                <a href={`/course/${course.id}`}>View Course</a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
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
