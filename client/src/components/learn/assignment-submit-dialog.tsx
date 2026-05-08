import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Paperclip, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const sb: any = supabase;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: any;
  onSubmitted?: () => void;
}

export default function AssignmentSubmitDialog({ open, onOpenChange, assignment, onSubmitted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["assignment-submission", assignment?.id, user?.id],
    enabled: !!assignment?.id && !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await sb.from("assignment_submissions")
        .select("*").eq("assignment_id", assignment.id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) { setContent(existing.content || ""); }
    else { setContent(""); setFiles([]); }
  }, [existing, open]);

  const submit = async () => {
    if (!content.trim() && files.length === 0) {
      toast({ title: "Add a response or file", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const paths: string[] = existing?.attachment_urls || [];
      for (const f of files) {
        const path = `${user!.id}/${assignment.id}/${crypto.randomUUID()}-${f.name}`;
        const { error } = await sb.storage.from("assignment-submissions").upload(path, f);
        if (error) throw error;
        paths.push(path);
      }
      const isLate = assignment.due_date ? new Date() > new Date(assignment.due_date) : false;
      if (existing) {
        const { error } = await sb.from("assignment_submissions").update({
          content: content.trim(), attachment_urls: paths, submitted_at: new Date().toISOString(),
          is_late_submission: isLate,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("assignment_submissions").insert({
          assignment_id: assignment.id, user_id: user!.id,
          content: content.trim(), attachment_urls: paths,
          submitted_at: new Date().toISOString(), is_late_submission: isLate,
        });
        if (error) throw error;
      }
      toast({ title: existing ? "Submission updated" : "Assignment submitted" });
      qc.invalidateQueries({ queryKey: ["assignment-submission", assignment.id] });
      qc.invalidateQueries({ queryKey: ["course-submissions"] });
      onSubmitted?.();
      onOpenChange(false);
      setFiles([]);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await sb.storage.from("assignment-submissions").createSignedUrl(path, 3600);
    if (error) { toast({ title: "Download failed", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  if (!assignment) return null;
  const graded = existing?.graded_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{assignment.title}</DialogTitle></DialogHeader>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" /> : (
        <div className="space-y-4">
          {assignment.instructions && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Instructions</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{assignment.instructions}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {assignment.due_date && <Badge variant="outline">Due {new Date(assignment.due_date).toLocaleDateString()}</Badge>}
            <Badge variant="outline">Max {assignment.max_score} pts</Badge>
            {existing && <Badge className="bg-[#22C55E] text-white border-0">Submitted</Badge>}
            {graded && <Badge className="bg-blue-600 text-white border-0">Graded · {existing.score}/{assignment.max_score}</Badge>}
          </div>

          {graded && existing.feedback && (
            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-semibold mb-1">Instructor feedback</h4>
              <p className="text-sm whitespace-pre-line">{existing.feedback}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Your response</label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[140px] mt-1"
              placeholder="Type your answer..." disabled={!!graded} />
          </div>

          {existing?.attachment_urls?.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Submitted files</label>
              {existing.attachment_urls.map((p: string, i: number) => (
                <Button key={i} type="button" variant="outline" size="sm" onClick={() => downloadAttachment(p)} className="mr-2">
                  <Download className="h-3 w-3 mr-1" />{p.split("/").pop()?.split("-").slice(1).join("-") || `File ${i + 1}`}
                </Button>
              ))}
            </div>
          )}

          {!graded && (
            <div>
              <label className="text-sm font-medium flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />Attach files (optional)</label>
              <Input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="mt-1" />
              {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</p>}
            </div>
          )}
        </div>
        )}
        {!graded && (
          <DialogFooter>
            <Button onClick={submit} disabled={busy} className="bg-[#B91C1C] hover:bg-[#A01818]">
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {existing ? "Update submission" : "Submit"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
