import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Plus, FileText, Search, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LearnCourse, LearnLesson, formatTimeStamp } from "./types";

interface Props {
  course: LearnCourse;
  lesson: LearnLesson;
  moduleTitle?: string;
  getCurrentVideoTime: () => number;
}

export default function ContentTabs({ course, lesson, moduleTitle, getCurrentVideoTime }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ===== Notes =====
  const [noteDraft, setNoteDraft] = useState("");
  const [withTimestamp, setWithTimestamp] = useState(false);
  const { data: notes = [] } = useQuery({
    queryKey: ["lesson-notes", lesson.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_notes")
        .select("*").eq("lesson_id", lesson.id).eq("user_id", user!.id)
        .order("video_timestamp_seconds", { ascending: true, nullsFirst: true });
      if (error) throw error; return data || [];
    },
  });
  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteDraft.trim()) return;
      const { error } = await supabase.from("lesson_notes").insert({
        user_id: user!.id, lesson_id: lesson.id, content: noteDraft.trim(),
        video_timestamp_seconds: withTimestamp ? Math.floor(getCurrentVideoTime()) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setNoteDraft(""); setWithTimestamp(false); qc.invalidateQueries({ queryKey: ["lesson-notes", lesson.id] }); },
    onError: (e: any) => toast({ title: "Could not save note", description: e.message, variant: "destructive" }),
  });
  const deleteNote = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("lesson_notes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-notes", lesson.id] }),
  });

  // ===== Q&A =====
  const [qFilter, setQFilter] = useState<"all" | "mine" | "unanswered">("all");
  const [qSearch, setQSearch] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qBody, setQBody] = useState("");

  const { data: questions = [] } = useQuery({
    queryKey: ["lesson-questions", lesson.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_questions")
        .select("*, replies:lesson_question_replies(*)")
        .eq("lesson_id", lesson.id)
        .order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
  });
  const askQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lesson_questions").insert({
        lesson_id: lesson.id, author_id: user!.id, title: qTitle.trim(), body: qBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setAskOpen(false); setQTitle(""); setQBody(""); qc.invalidateQueries({ queryKey: ["lesson-questions", lesson.id] }); },
    onError: (e: any) => toast({ title: "Could not post question", description: e.message, variant: "destructive" }),
  });
  const reply = useMutation({
    mutationFn: async ({ qid, body }: { qid: string; body: string }) => {
      const isInstructor = user?.id === course.instructor_id;
      const { error } = await supabase.from("lesson_question_replies").insert({
        question_id: qid, author_id: user!.id, body, is_instructor_reply: isInstructor,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-questions", lesson.id] }),
  });

  const filteredQuestions = useMemo(() => {
    return questions.filter((q: any) => {
      if (qFilter === "mine" && q.author_id !== user?.id) return false;
      if (qFilter === "unanswered" && (q.replies?.length || 0) > 0) return false;
      if (qSearch && !`${q.title} ${q.body}`.toLowerCase().includes(qSearch.toLowerCase())) return false;
      return true;
    });
  }, [questions, qFilter, qSearch, user?.id]);

  // ===== Announcements =====
  const { data: announcements = [] } = useQuery({
    queryKey: ["course-announcements", course.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_announcements")
        .select("*").eq("course_id", course.id).order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
  });
  const { data: reads = [] } = useQuery({
    queryKey: ["announcement-reads", course.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("announcement_reads").select("announcement_id").eq("user_id", user!.id);
      if (error) throw error; return data?.map(r => r.announcement_id) || [];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("announcement_reads").upsert({ user_id: user!.id, announcement_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement-reads", course.id] }),
  });

  // ===== Resources =====
  const { data: resources = [] } = useQuery({
    queryKey: ["lesson-resources", lesson.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_resources").select("*").eq("lesson_id", lesson.id).order("created_at");
      if (error) throw error; return data || [];
    },
  });

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent h-auto p-0 gap-2 sm:gap-4">
        {["overview", "qa", "notes", "announcements", "resources"].map(t => (
          <TabsTrigger
            key={t}
            value={t}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#B91C1C] data-[state=active]:text-[#B91C1C] data-[state=active]:bg-transparent py-3 px-2 capitalize text-sm font-medium"
          >
            {t === "qa" ? "Q&A" : t}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="pt-4">
        <Card><CardContent className="p-6 space-y-6">
          <section>
            <h3 className="font-semibold mb-2">About this course</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{course.description || "No description."}</p>
          </section>
          {moduleTitle && (
            <section>
              <h3 className="font-semibold mb-1">Current section</h3>
              <p className="text-sm text-muted-foreground">{moduleTitle}</p>
            </section>
          )}
          {lesson.description && (
            <section>
              <h3 className="font-semibold mb-1">About this lesson</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{lesson.description}</p>
            </section>
          )}
        </CardContent></Card>
      </TabsContent>

      {/* Q&A */}
      <TabsContent value="qa" className="pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search questions..." className="pl-9" />
          </div>
          <select value={qFilter} onChange={e => setQFilter(e.target.value as any)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All questions</option>
            <option value="mine">My questions</option>
            <option value="unanswered">Unanswered</option>
          </select>
          <Dialog open={askOpen} onOpenChange={setAskOpen}>
            <DialogTrigger asChild><Button className="bg-[#B91C1C] hover:bg-[#A01818]"><Plus className="h-4 w-4 mr-1" />Ask a Question</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ask a question</DialogTitle></DialogHeader>
              <Input placeholder="Title" value={qTitle} onChange={e => setQTitle(e.target.value)} />
              <Textarea placeholder="Your question..." value={qBody} onChange={e => setQBody(e.target.value)} className="min-h-[120px]" />
              <DialogFooter>
                <Button onClick={() => askQuestion.mutate()} disabled={!qTitle.trim() || !qBody.trim() || askQuestion.isPending}>Post question</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {filteredQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No questions yet.</p>
        ) : filteredQuestions.map((q: any) => (
          <QuestionCard key={q.id} q={q} onReply={(body) => reply.mutate({ qid: q.id, body })} />
        ))}
      </TabsContent>

      {/* Notes */}
      <TabsContent value="notes" className="pt-4 space-y-3">
        <Card><CardContent className="p-4 space-y-3">
          <Textarea placeholder="Take notes for this lesson..." value={noteDraft} onChange={e => setNoteDraft(e.target.value)} className="min-h-[100px]" />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withTimestamp} onChange={e => setWithTimestamp(e.target.checked)} />
              Save with current video timestamp
            </label>
            <Button onClick={() => addNote.mutate()} disabled={!noteDraft.trim() || addNote.isPending}>
              <Plus className="h-4 w-4 mr-1" />Add note
            </Button>
          </div>
        </CardContent></Card>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No notes yet for this lesson.</p>
        ) : notes.map((n: any) => (
          <Card key={n.id}><CardContent className="p-4 flex gap-3 items-start">
            {n.video_timestamp_seconds != null && (
              <Badge variant="outline" className="font-mono">{formatTimeStamp(n.video_timestamp_seconds)}</Badge>
            )}
            <p className="flex-1 text-sm whitespace-pre-line">{n.content}</p>
            <button onClick={() => deleteNote.mutate(n.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete note">
              <Trash2 className="h-4 w-4" />
            </button>
          </CardContent></Card>
        ))}
      </TabsContent>

      {/* Announcements */}
      <TabsContent value="announcements" className="pt-4 space-y-3">
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No announcements yet.</p>
        ) : announcements.map((a: any) => {
          const unread = !reads.includes(a.id);
          return (
            <Card key={a.id} onClick={() => unread && markRead.mutate(a.id)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {unread && <span className="h-2 w-2 rounded-full bg-[#B91C1C]" />}
                  <h4 className="font-semibold">{a.title}</h4>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      {/* Resources */}
      <TabsContent value="resources" className="pt-4 space-y-2">
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No downloadable resources for this lesson.</p>
        ) : resources.map((r: any) => (
          <Card key={r.id}><CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#B91C1C] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{(r.resource_type || "file").toUpperCase()}{r.file_size_mb ? ` · ${r.file_size_mb} MB` : ""}</p>
            </div>
            <Button asChild size="sm" variant="outline"><a href={r.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4 mr-1" />Download</a></Button>
          </CardContent></Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}

function QuestionCard({ q, onReply }: { q: any; onReply: (body: string) => void }) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback>{(q.title || "?")[0]}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{q.title}</h4>
            <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{q.body}</p>
        </div>
      </div>
      {q.replies?.length > 0 && (
        <div className="pl-11 space-y-2">
          {q.replies.map((r: any) => (
            <div key={r.id} className="border-l-2 border-muted pl-3">
              <div className="flex items-center gap-2">
                {r.is_instructor_reply && <Badge className="bg-[#B91C1C] text-white border-0 text-[10px]">Instructor ★</Badge>}
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm whitespace-pre-line mt-1">{r.body}</p>
            </div>
          ))}
        </div>
      )}
      <div className="pl-11">
        {show ? (
          <div className="flex gap-2">
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a reply..." />
            <Button size="sm" onClick={() => { if (draft.trim()) { onReply(draft.trim()); setDraft(""); setShow(false); } }}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShow(true)}>Reply</Button>
        )}
      </div>
    </CardContent></Card>
  );
}
