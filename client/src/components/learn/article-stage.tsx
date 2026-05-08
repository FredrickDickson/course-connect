import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, FileText } from "lucide-react";
import { LearnLesson } from "./types";

interface Props {
  lesson: LearnLesson;
  completed: boolean;
  onMarkComplete: () => void;
}

export default function ArticleStage({ lesson, completed, onMarkComplete }: Props) {
  const html = DOMPurify.sanitize(lesson.content || "<p>No content.</p>");
  return (
    <div className="bg-background min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <FileText className="h-4 w-4" /> Article
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif">{lesson.title}</h1>
        <Card>
          <CardContent className="prose prose-sm sm:prose max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: html }} />
        </Card>
        <div className="flex justify-end">
          <Button
            onClick={onMarkComplete}
            disabled={completed}
            className={completed ? "bg-[#22C55E] hover:bg-[#22C55E]" : "bg-[#B91C1C] hover:bg-[#A01818]"}
          >
            <Check className="h-4 w-4 mr-1" />
            {completed ? "Completed" : "Mark as complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
