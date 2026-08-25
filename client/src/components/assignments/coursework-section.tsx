import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, HelpCircle, Users, ClipboardCheck } from "lucide-react";
import { AssignmentBuilder } from "@/components/AssignmentBuilder";
import { QuizBuilder } from "@/components/QuizBuilder";
import { ManageGroupsPanel } from "@/components/assignments/manage-groups-panel";
import { GradingPanel } from "@/components/assignments/grading-panel";
import AssignmentSubmitDialog from "@/components/learn/assignment-submit-dialog";
import { fetchCourseworkFor, fetchQuizById, type CourseworkAnchor } from "@/lib/curriculum-mutations";
import { usePostedBanner } from "@/hooks/use-posted-banner";

interface Props {
  anchor: CourseworkAnchor;
  canManage: boolean;
}

type PanelState =
  | { kind: "assignment-form"; assignment?: any }
  | { kind: "quiz-form"; quiz?: any }
  | { kind: "groups"; assignment: any }
  | { kind: "grading"; assignment: any }
  | { kind: "submit"; assignment: any }
  | null;

// Wraps QuizBuilder for the edit case: the list endpoint only returns the quizzes
// row, not its questions/answers, so opening "Edit" without fetching full detail
// first would save an empty question set over the existing quiz (update_anchored_quiz
// replaces all questions with whatever is passed in).
function QuizEditForm({
  anchor,
  quizId,
  onSaved,
  onDeleted,
}: {
  anchor: CourseworkAnchor;
  quizId?: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { data: fullQuiz, isLoading } = useQuery({
    queryKey: ["quiz-detail", quizId],
    queryFn: () => fetchQuizById(quizId!),
    enabled: !!quizId,
  });

  if (quizId && isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />;

  return (
    <QuizBuilder
      anchor={anchor}
      initialQuiz={fullQuiz ? { ...fullQuiz, id: quizId! } : undefined}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

export function CourseworkSection({ anchor, canManage }: Props) {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<PanelState>(null);
  const queryKey = anchor.type === "session" ? ["session-coursework", anchor.id] : ["course-coursework", anchor.id];

  usePostedBanner(anchor.type === "session" ? { liveSessionId: anchor.id } : { courseId: anchor.id });

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchCourseworkFor(anchor),
  });

  const close = () => setPanel(null);
  const refetch = () => qc.invalidateQueries({ queryKey });

  const assignments = data?.assignments || [];
  const quizzes = data?.quizzes || [];
  const visibleAssignments = canManage ? assignments : assignments.filter((a: any) => a.posted_at);
  const visibleQuizzes = canManage ? quizzes : quizzes.filter((q: any) => q.posted_at);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "assignment-form" })}>
            <Plus className="h-4 w-4 mr-1" />
            New Assignment
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "quiz-form" })}>
            <Plus className="h-4 w-4 mr-1" />
            New Quiz
          </Button>
        </div>
      )}

      {visibleAssignments.length === 0 && visibleQuizzes.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          {canManage ? "No assignments or quizzes yet." : "Nothing posted here yet."}
        </p>
      )}

      {visibleAssignments.map((a: any) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {a.title}
                {a.group_mode === "group" && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    Group
                  </Badge>
                )}
              </CardTitle>
              <Badge className={a.posted_at ? "bg-[#22C55E] text-white border-0" : ""} variant={a.posted_at ? undefined : "outline"}>
                {a.posted_at ? "Posted" : "Draft"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canManage ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "assignment-form", assignment: a })}>
                  Edit
                </Button>
                {a.group_mode === "group" && (
                  <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "groups", assignment: a })}>
                    <Users className="h-4 w-4 mr-1" />
                    Manage Groups
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "grading", assignment: a })}>
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Grade
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setPanel({ kind: "submit", assignment: a })}>
                Open
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {visibleQuizzes.map((q: any) => (
        <Card key={q.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {q.title}
              </CardTitle>
              <Badge className={q.posted_at ? "bg-[#22C55E] text-white border-0" : ""} variant={q.posted_at ? undefined : "outline"}>
                {q.posted_at ? "Posted" : "Draft"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "quiz-form", quiz: q })}>
                Edit
              </Button>
            ) : (
              <Link href={`/quiz/${q.id}`}>
                <Button size="sm">Take quiz</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={panel?.kind === "assignment-form"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{panel?.kind === "assignment-form" && panel.assignment ? "Edit Assignment" : "New Assignment"}</DialogTitle>
          </DialogHeader>
          {panel?.kind === "assignment-form" && (
            <AssignmentBuilder
              anchor={anchor}
              initialAssignment={
                panel.assignment
                  ? {
                      id: panel.assignment.id,
                      title: panel.assignment.title,
                      description: panel.assignment.description,
                      instructions: panel.assignment.instructions,
                      maxPoints: panel.assignment.max_score,
                      dueDate: panel.assignment.due_date,
                      allowLateSubmission: panel.assignment.allow_late_submission,
                      groupMode: panel.assignment.group_mode,
                      allowGroupMeetings: panel.assignment.allow_group_meetings,
                      postedAt: panel.assignment.posted_at,
                    }
                  : undefined
              }
              onSaved={() => {
                refetch();
                close();
              }}
              onDeleted={() => {
                refetch();
                close();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel?.kind === "quiz-form"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{panel?.kind === "quiz-form" && panel.quiz ? "Edit Quiz" : "New Quiz"}</DialogTitle>
          </DialogHeader>
          {panel?.kind === "quiz-form" && (
            <QuizEditForm anchor={anchor} quizId={panel.quiz?.id} onSaved={() => { refetch(); close(); }} onDeleted={() => { refetch(); close(); }} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel?.kind === "groups"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Groups — {panel?.kind === "groups" && panel.assignment.title}</DialogTitle>
          </DialogHeader>
          {panel?.kind === "groups" && (
            <ManageGroupsPanel assignmentId={panel.assignment.id} allowGroupMeetings={!!panel.assignment.allow_group_meetings} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel?.kind === "grading"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade — {panel?.kind === "grading" && panel.assignment.title}</DialogTitle>
          </DialogHeader>
          {panel?.kind === "grading" && (
            <GradingPanel assignmentId={panel.assignment.id} maxScore={panel.assignment.max_score} groupMode={panel.assignment.group_mode} />
          )}
        </DialogContent>
      </Dialog>

      {panel?.kind === "submit" && (
        <AssignmentSubmitDialog open onOpenChange={(o) => !o && close()} assignment={panel.assignment} onSubmitted={refetch} />
      )}
    </div>
  );
}
