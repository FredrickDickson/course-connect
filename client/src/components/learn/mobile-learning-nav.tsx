import { Button } from "@/components/ui/button";
import { ListVideo, ChevronRight, PlayCircle, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CourseSidebar from "@/components/learn/course-sidebar";

interface MobileLearningNavProps {
  course: any;
  courseId: string;
  currentLessonId: string;
  progress: any[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onNextLesson?: () => void;
  hasNextLesson?: boolean;
}

export default function MobileLearningNav({
  course,
  courseId,
  currentLessonId,
  progress,
  onToggleComplete,
  onNextLesson,
  hasNextLesson,
}: MobileLearningNavProps) {
  const completedCount = progress.filter(p => p.completed).length;
  const totalLessons = course?.modules?.flatMap((m: any) => m.lessons || []).length || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around p-2 gap-1">
        {/* Course Content */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 flex flex-col items-center gap-1 h-16">
              <ListVideo className="h-5 w-5" />
              <span className="text-xs">Content</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-full sm:max-w-md bg-[#1C1D1F] border-l-0">
            <CourseSidebar
              course={course}
              courseId={courseId}
              currentLessonId={currentLessonId}
              progress={progress}
              onToggleComplete={onToggleComplete}
            />
          </SheetContent>
        </Sheet>

        {/* Progress */}
        <Button variant="ghost" size="sm" className="flex-1 flex flex-col items-center gap-1 h-16">
          <div className="relative">
            <BarChart3 className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
              {progressPercent}%
            </span>
          </div>
          <span className="text-xs">Progress</span>
        </Button>

        {/* Next Lesson */}
        {hasNextLesson && onNextLesson ? (
          <Button
            size="sm"
            onClick={onNextLesson}
            className="flex-1 flex flex-col items-center gap-1 h-16 bg-primary text-primary-foreground"
          >
            <PlayCircle className="h-5 w-5" />
            <span className="text-xs">Next</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="flex-1 flex flex-col items-center gap-1 h-16"
          >
            <ChevronRight className="h-5 w-5" />
            <span className="text-xs">Next</span>
          </Button>
        )}
      </div>
    </div>
  );
}
