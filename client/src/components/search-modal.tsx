import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, BookOpen, Tag, Folder } from "lucide-react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Suggestion {
  type: "course" | "category" | "tag";
  id: string;
  title: string;
  subtitle?: string | null;
  url: string;
  eligibility?: {
    status: "eligible" | "upgrade-required" | "enrolled" | "unknown";
    label: string;
  };
}

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  // Fetch user's track progress
  const { data: trackProgress = {} } = useQuery({
    queryKey: ["track-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await supabase
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

  // Fetch user's enrollments
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

  // Fetch courses for autocomplete
  const { data: courses = [] } = useQuery({
    queryKey: ["search-courses", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subtitle, category_id, level, track")
        .eq("is_published", true)
        .ilike("title", `%${search}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 2,
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

  // Fetch categories for autocomplete
  const { data: categories = [] } = useQuery({
    queryKey: ["search-categories", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", `%${search}%`)
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 2,
  });

  // Combine suggestions
  const suggestions: Suggestion[] = [
    ...courses.map(c => ({
      type: "course" as const,
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      url: `/course/${c.id}`,
      eligibility: checkCourseEligibility(c),
    })),
    ...categories.map(c => ({
      type: "category" as const,
      id: c.id,
      title: c.name,
      url: `/course-catalog?category=${c.id}`,
    })),
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      navigate(suggestions[selectedIndex].url);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    navigate(suggestion.url);
    onClose();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/course-catalog?search=${encodeURIComponent(search)}`);
      onClose();
    }
  };

  const getSuggestionIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "course":
        return <BookOpen className="w-4 h-4" />;
      case "category":
        return <Folder className="w-4 h-4" />;
      case "tag":
        return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <div className="p-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search courses, categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10 h-12 text-lg"
              autoFocus
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearch("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </form>
        </div>

        {search.length >= 2 && suggestions.length > 0 && (
          <div className="border-t max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left ${
                  index === selectedIndex ? "bg-accent" : ""
                }`}
              >
                <div className="mt-0.5 text-muted-foreground">
                  {getSuggestionIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{suggestion.title}</p>
                    {suggestion.type === "course" && suggestion.eligibility && suggestion.eligibility.status !== "unknown" && (
                      <Badge
                        variant={
                          suggestion.eligibility.status === "eligible"
                            ? "default"
                            : suggestion.eligibility.status === "enrolled"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          suggestion.eligibility.status === "eligible"
                            ? "bg-green-500 text-white text-[10px]"
                            : suggestion.eligibility.status === "enrolled"
                            ? "bg-blue-500 text-white text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {suggestion.eligibility.label}
                      </Badge>
                    )}
                  </div>
                  {suggestion.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{suggestion.subtitle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {search.length >= 2 && suggestions.length === 0 && (
          <div className="border-t p-8 text-center">
            <p className="text-muted-foreground">No results found for "{search}"</p>
          </div>
        )}

        {search.length < 2 && (
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("Arbitration");
                  inputRef.current?.focus();
                }}
              >
                Arbitration
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("Mediation");
                  inputRef.current?.focus();
                }}
              >
                Mediation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("Associate");
                  inputRef.current?.focus();
                }}
              >
                Associate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
