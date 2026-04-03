// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { Search, Filter, SortAsc, SortDesc, Grid, List, Heart, BookOpen, Clock, Star, Users } from "lucide-react";

export default function Courses() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['/api/courses', {
      search,
      category: category === 'all' ? '' : category,
      level: level === 'all' ? '' : level,
      sortBy,
      priceRange: priceRange === 'all' ? '' : priceRange
    }],
    enabled: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/courses/stats'],
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
                {stats?.totalCourses || '50+'} Professional Courses
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                {t('courses.title')}
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
                {t('courses.subtitle')}
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
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              data-testid="input-search"
              type="text"
              placeholder="Search courses, topics, or instructors..."
              className="pl-12 pr-4 py-3 text-lg border-0 bg-white shadow-md rounded-xl focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
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
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{search}"
                  <button onClick={() => setSearch("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {categories.find((c: any) => c.slug === category)?.name || category}
                  <button onClick={() => setCategory("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {level && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Level: {level}
                  <button onClick={() => setLevel("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {priceRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Price: {priceRange === "free" ? "Free" : `$${priceRange}`}
                  <button onClick={() => setPriceRange("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
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
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Professional Courses</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Internationally recognized courses designed by leading ADR experts and practitioners
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Highlight top courses */}
            {courses.filter((course: any) => course.isFeatured).slice(0, 2).map((course: any) => (
              <Card key={course.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="relative">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-black/20 text-white border-0">
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
                          {course.duration} hours • {course.enrollmentCount} enrolled
                        </div>
                      </div>
                      <Button>
                        Learn More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  {courses.length === 0 ? 'No courses found' : 'Available Courses'}
                </h2>
                <p className="text-muted-foreground mt-1" data-testid="results-count">
                  {courses.length > 0 && `${courses.length} course${courses.length !== 1 ? 's' : ''} available`}
                </p>
              </div>

              {courses.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {Math.min(courses.length, 12)} of {courses.length} results
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse" data-testid={`skeleton-course-${i}`}>
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
              <h3 className="text-xl font-semibold text-foreground mb-2">No courses found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any courses matching your criteria. Try adjusting your filters or search terms.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
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
            <div className={
              viewMode === "grid"
                ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                : "space-y-6"
            }>
              {courses.map((course: any) => (
                viewMode === "grid" ? (
                  <CourseCard key={course.id} course={course} />
                ) : (
                  <Card key={course.id} className="hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex space-x-4">
                        <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
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
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                                {course.title}
                              </h3>
                              {course.subtitle && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {course.subtitle}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                                  <span>{course.avgRating?.toFixed(1) || '0.0'}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="w-4 h-4" />
                                  <span>{course.enrollmentCount || 0}</span>
                                </div>
                                {course.duration && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{course.duration}h</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2 ml-4">
                              <div className="text-lg font-bold text-primary">
                                {course.price && parseFloat(course.price.toString()) > 0
                                  ? `$${parseFloat(course.price.toString()).toFixed(2)}`
                                  : 'Free'
                                }
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
                )
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
