import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Send, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LearnLesson } from "./types";
import AssignmentSubmitDialog from "./assignment-submit-dialog";

const sb: any = supabase;

export default function AssignmentStage({ lesson, onComplete }: { lesson: LearnLesson; onComplete?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: assignment } = useQuery({
    queryKey: ["lesson-assignment", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("assignments")
        .select("*").eq("lesson_id", lesson.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: submission } = useQuery({
    queryKey: ["assignment-submission", assignment?.id, user?.id],
    enabled: !!assignment?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("assignment_submissions")
        .select("*").eq("assignment_id", assignment.id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Removed auto-completion - users must explicitly mark lesson as complete after reviewing submission

  return (
    <div className="bg-background min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <ClipboardList className="h-4 w-4" /> Assignment
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif">{lesson.title}</h1>

        {!assignment ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No assignment attached to this lesson yet.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold">{assignment.title}</h3>
              {assignment.description && <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {assignment.due_date && <Badge variant="outline">Due {new Date(assignment.due_date).toLocaleDateString()}</Badge>}
              <Badge variant="outline">Max {assignment.max_score} pts</Badge>
              {submission && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Submitted</Badge>}
              {submission?.graded_at && <Badge className="bg-blue-600 text-white border-0">Score {submission.score}/{assignment.max_score}</Badge>}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(true)} className="bg-[#B91C1C] hover:bg-[#A01818]">
                <Send className="h-4 w-4 mr-1" />{submission ? "View / update submission" : "Submit assignment"}
              </Button>
            </div>
          </CardContent></Card>
        )}

        <AssignmentSubmitDialog open={open} onOpenChange={setOpen} assignment={assignment} />
      </div>
    </div>
  );
}
