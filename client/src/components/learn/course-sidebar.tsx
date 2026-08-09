import { useState, useMemo } from "react";
import { Link } from "wouter";
import { X, Check, Play, FileText, HelpCircle, Target, ChevronDown, FileStack } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LearnCourse, LearnLesson, LearnModule, ProgressRow, formatDuration } from "./types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  course: LearnCourse;
  courseId: string;
  currentLessonId?: string;
  progress: ProgressRow[];
  onClose?: () => void;
  onToggleComplete: (lessonId: string, completed: boolean) => void;
  onLessonClick?: (lessonId: string) => void;
}

const lessonIcon = (t?: string | null) => {
  switch ((t || "video").toLowerCase()) {
    case "pdf": case "reading": return FileText;
    case "quiz": case "assessment": return HelpCircle;
    case "assignment": return Target;
    default: return Play;
  }
};

const muxThumbnailUrl = (lesson: LearnLesson) => {
  if (!lesson.mux_playback_id || lesson.mux_status !== "ready") return null;
  const time = lesson.mux_thumbnail_time ?? Math.min(10, Math.max(0, Math.floor((lesson.duration_seconds || 0) * 0.1)));
  return `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.jpg?time=${time}&width=160&height=90&fit_mode=preserve`;
};

export default function CourseSidebar({ course, courseId, currentLessonId, progress, onClose, onToggleComplete, onLessonClick }: Props) {
  const allLessons = useMemo(
    () => course.modules?.flatMap(m => m.lessons || []) || [],
    [course]
  );
  const completed = progress.filter(p => p.completed).length;
  const total = allLessons.length;
  const remaining = allLessons.reduce((s, l) => s + (progress.find(p => p.lesson_id === l.id)?.completed ? 0 : (l.duration_seconds || 0)), 0);

  // Fetch resources for all lessons
  const { data: lessonResources } = useQuery({
    queryKey: ["lesson-resources", courseId],
    queryFn: async () => {
      const lessonIds = allLessons.map(l => l.id);
      if (lessonIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("lesson_resources")
        .select("*")
        .in("lesson_id", lessonIds);
      
      if (error) throw error;
      
      // Group by lesson_id
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((resource: any) => {
        if (!grouped[resource.lesson_id]) {
          grouped[resource.lesson_id] = [];
        }
        grouped[resource.lesson_id].push(resource);
      });
      
      return grouped;
    },
    enabled: allLessons.length > 0,
  });

  const handleDownloadResource = async (resource: any) => {
    try {
      if (resource.storage_path) {
        const { data, error } = await supabase.storage
          .from("lesson-resources")
          .createSignedUrl(resource.storage_path, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank");
        }
      } else if (resource.external_url) {
        window.open(resource.external_url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading resource:", error);
    }
  };

  // Default-open the section containing current lesson
  const currentSectionId = course.modules?.find(m => m.lessons?.some(l => l.id === currentLessonId))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    course.modules?.forEach(m => { o[m.id] = m.id === currentSectionId || true; });
    return o;
  });

  return (
    <aside className="flex flex-col h-full bg-[#1C1D1F] text-white w-full lg:w-[380px] shrink-0 border-l border-white/5">
      <div className="flex items-center justify-between px-4 h-14 sm:h-12 border-b border-white/10">
        <h2 className="font-semibold text-sm sm:text-base">Course content</h2>
        {onClose && (
          <button onClick={onClose} className="p-2 sm:p-1 rounded-lg sm:rounded hover:bg-white/10 active:bg-white/20 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] touch-none" aria-label="Close sidebar">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-white/10 space-y-2">
        <p className="text-xs text-white/70">
          {completed} of {total} lessons · {formatDuration(remaining)} remaining
        </p>
        <Progress value={total ? (completed / total) * 100 : 0} className="h-1.5 bg-white/15 [&>div]:bg-[#22C55E]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {course.modules?.map((module: LearnModule, mIdx: number) => {
          const lessons = module.lessons || [];
          const sectionDoneCount = lessons.filter(l => progress.find(p => p.lesson_id === l.id)?.completed).length;
          const sectionDuration = lessons.reduce((s, l) => s + (l.duration_seconds || 0), 0);
          const allDone = lessons.length > 0 && sectionDoneCount === lessons.length;
          const isOpen = open[module.id] ?? true;

          return (
            <div key={module.id} className="border-b border-white/5">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-[#2D2F31] hover:bg-[#34363A] transition-colors min-h-11"
                onClick={() => setOpen(o => ({ ...o, [module.id]: !isOpen }))}
              >
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-sm truncate">Section {mIdx + 1}: {module.title}</p>
                  <p className="text-xs text-white/60 mt-0.5">{sectionDoneCount} / {lessons.length} · {formatDuration(sectionDuration)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {allDone && <Badge className="bg-[#22C55E] hover:bg-[#22C55E] text-white border-0 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Complete</Badge>}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </div>
              </button>

              {isOpen && (
                <ul>
                  {lessons.map((lesson: LearnLesson, lIdx: number) => {
                    const lp = progress.find(p => p.lesson_id === lesson.id);
                    const done = !!lp?.completed;
                    const isActive = lesson.id === currentLessonId;
                    const Icon = lessonIcon(lesson.content_type);
                    const thumbnailUrl = muxThumbnailUrl(lesson);
                    const resources = lessonResources?.[lesson.id] || [];
                    const hasResources = resources.length > 0;
                    
                    return (
                      <li key={lesson.id}>
                        <div className={cn(
                          "flex items-start gap-3 sm:gap-2 px-4 py-3 sm:py-2 text-sm hover:bg-[#2D2F31] transition-colors min-h-[44px] sm:min-h-11",
                          isActive && "bg-[#2D2F31] border-l-[3px] border-[#B91C1C] pl-[13px]",
                          !isActive && "border-l-[3px] border-transparent",
                        )}>
                          <Link
                            href={`/learn/${courseId}/${lesson.id}`}
                            onClick={() => onLessonClick?.(lesson.id)}
                            className="flex items-start gap-3 sm:gap-2 flex-1 min-w-0 touch-none"
                          >
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleComplete(lesson.id, !done); }}
                              className={cn(
                                "mt-0.5 h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border flex items-center justify-center touch-none",
                                done ? "bg-[#22C55E] border-[#22C55E]" : "border-white/40 hover:border-white active:border-white"
                              )}
                              aria-label={done ? "Mark as not complete" : "Mark complete"}
                            >
                              {done && <Check className="h-3 w-3 text-white" />}
                            </button>
                            {thumbnailUrl ? (
                              <div className="relative mt-0.5 h-10 w-[72px] shrink-0 overflow-hidden rounded bg-black/40">
                                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Play className="h-3.5 w-3.5 fill-white text-white" />
                                </div>
                              </div>
                            ) : (
                              <Icon className="h-3.5 w-3.5 mt-1 shrink-0 text-white/60" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={cn("truncate", isActive ? "font-semibold text-white" : "text-white/90")}>
                                {lIdx + 1}. {lesson.title}
                              </p>
                              {lesson.duration_seconds ? (
                                <p className="text-[11px] text-white/50 mt-0.5">{formatDuration(lesson.duration_seconds)}</p>
                              ) : null}
                            </div>
                          </Link>
                          
                          {hasResources && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="shrink-0 h-8 px-3 border-purple-500/50 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileStack className="h-3.5 w-3.5 mr-1.5" />
                                  Resources
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {resources.map((resource: any) => (
                                  <DropdownMenuItem 
                                    key={resource.id}
                                    onClick={() => handleDownloadResource(resource)}
                                    className="cursor-pointer"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    <span className="truncate">{resource.title}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
