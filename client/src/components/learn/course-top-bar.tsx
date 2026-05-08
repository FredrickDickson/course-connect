import { Link } from "wouter";
import { ArrowLeft, Share2, MoreVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LearnCourse, levelToPostNominal } from "./types";

interface Props {
  course: LearnCourse;
  completed: number;
  total: number;
  nextLessonHref?: string;
  onReportIssue?: () => void;
}

export default function CourseTopBar({ course, completed, total, nextLessonHref, onReportIssue }: Props) {
  const { toast } = useToast();
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const truncated = course.title.length > 50 ? course.title.slice(0, 50) + "..." : course.title;
  const post = levelToPostNominal(course.level, course.track);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Course link copied to clipboard" });
    } catch { toast({ title: "Couldn't copy", variant: "destructive" }); }
  };

  return (
    <header className="flex items-center h-14 px-3 sm:px-4 bg-[#1C1D1F] text-white border-b border-white/10 gap-3">
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white shrink-0" aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h1 className="font-semibold text-sm sm:text-base truncate">{truncated}</h1>
        {post && <Badge variant="outline" className="hidden sm:inline-flex border-white/30 text-white bg-transparent text-[10px]">{post}</Badge>}
      </div>

      <div className="hidden md:flex items-center gap-3 min-w-[260px]">
        <Progress value={pct} className="h-1.5 flex-1 bg-white/15 [&>div]:bg-[#22C55E]" />
        <span className="text-xs text-white/80 whitespace-nowrap tabular-nums">{completed} / {total} · {pct}%</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white hidden sm:inline-flex">
              Your Progress <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Course progress</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 space-y-2">
              <Progress value={pct} className="h-2" />
              <p className="text-sm text-muted-foreground">{completed} of {total} lessons completed ({pct}%)</p>
            </div>
            {nextLessonHref && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={nextLessonHref}>Continue to next lesson</Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={share} aria-label="Share">
          <Share2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast({ title: "Resources tab", description: "See the Resources tab below the video." })}>
              Download resources
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReportIssue}>Report an issue</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`mailto:support@cimarb.org?subject=${encodeURIComponent("Course question: " + course.title)}`}>
                Contact instructor
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
