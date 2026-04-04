import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CourseCard from "@/components/course-card";
import { supabase } from "@/integrations/supabase/client";

export default function CourseCatalog() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch categories from Supabase
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch published courses from Supabase
  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          `*,\n          category:categories(name),\n          instructor:users!courses_instructor_id_fkey(first_name, last_name)\n        `,
        )
        .eq("is_published", true);

      if (error) throw error;
      return data;
    },
  });

  const categories = ["all", ...categoriesData.map((cat: any) => cat.id)];
  const categoryNames = {
    all: "All Courses",
    ...Object.fromEntries(categoriesData.map((cat: any) => [cat.id, cat.name])),
  };

  // Filter courses by category
  const filteredCourses =
    selectedCategory === "all"
      ? courses
      : courses.filter((course) => course.category_id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1
              className="text-4xl font-bold text-foreground"
              data-testid="title"
            >
              Course Catalog
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional ADR training courses designed to build competency and
              expertise in international mediation and arbitration.
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-${typeof category === "string" ? category.toLowerCase() : category}`}
              >
                {categoryNames[category] || category}
              </Button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading courses...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">
                No courses available yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back soon for new courses!
              </p>
            </div>
          )}

          {/* Course Grid */}
          {!isLoading && filteredCourses.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
