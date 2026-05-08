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
import {
  Download, Plus, FileText, FileSpreadsheet, FileArchive, Image as ImageIcon,
  Video as VideoIcon, Music, Link2, File as FileIcon, Presentation, Trash2, Pencil, Eye, Loader2,
  HelpCircle, ClipboardList, Play, Check, Send,
} from "lucide-react";
import { Link } from "wouter";
import AssignmentSubmitDialog from "./assignment-submit-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LearnCourse, LearnLesson, formatTimeStamp } from "./types";

// Cast the supabase client to bypass missing generated types for new tables.
const sb: any = supabase;

interface Props {
  course: LearnCourse;
  lesson: LearnLesson;
  moduleTitle?: string;
  getCurrentVideoTime: () => number;
}

type ResourceType = "pdf" | "doc" | "xls" | "ppt" | "zip" | "image" | "video" | "audio" | "link" | "other";

function detectType(filename: string): ResourceType {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  return "other";
}

function ResourceIcon({ type }: { type: string }) {
  const cls = "h-5 w-5 text-[#B91C1C] shrink-0";
  switch (type) {
    case "pdf":
    case "doc": return <FileText className={cls} />;
    case "xls": return <FileSpreadsheet className={cls} />;
    case "ppt": return <Presentation className={cls} />;
    case "zip": return <FileArchive className={cls} />;
    case "image": return <ImageIcon className={cls} />;
    case "video": return <VideoIcon className={cls} />;
    case "audio": return <Music className={cls} />;
    case "link": return <Link2 className={cls} />;
    default: return <FileIcon className={cls} />;
  }
}

export default function ContentTabs({ course, lesson, moduleTitle, getCurrentVideoTime }: Props) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isInstructor = !!user && (user.id === course.instructor_id || (typeof isAdmin === "function" && isAdmin()));

  // ===== Activities (per-lesson quizzes & assignments) =====
  const { data: lessonQuizzes = [] } = useQuery({
    queryKey: ["lesson-quizzes", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("quizzes")
        .select("*, questions:quiz_questions(id)").eq("lesson_id", lesson.id);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ["lesson-quiz-attempts", lesson.id, user?.id],
    enabled: !!user?.id && lessonQuizzes.length > 0,
    queryFn: async () => {
      const ids = lessonQuizzes.map((q: any) => q.id);
      const { data, error } = await sb.from("quiz_attempts")
        .select("quiz_id, passed, score, completed_at").eq("user_id", user!.id).in("quiz_id", ids);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: lessonAssignments = [] } = useQuery({
    queryKey: ["lesson-assignments", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("assignments").select("*").eq("lesson_id", lesson.id);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: assignmentSubs = [] } = useQuery({
    queryKey: ["lesson-assignment-subs", lesson.id, user?.id],
    enabled: !!user?.id && lessonAssignments.length > 0,
    queryFn: async () => {
      const ids = lessonAssignments.map((a: any) => a.id);
      const { data, error } = await sb.from("assignment_submissions")
        .select("assignment_id, score, graded_at, submitted_at").eq("user_id", user!.id).in("assignment_id", ids);
      if (error) throw error;
      return data || [];
    },
  });
  const [submitFor, setSubmitFor] = useState<any>(null);
  const hasActivities = lessonQuizzes.length + lessonAssignments.length > 0;

  // ===== Notes =====
  const [noteDraft, setNoteDraft] = useState("");
  const [withTimestamp, setWithTimestamp] = useState(false);
  const { data: notes = [] } = useQuery({
    queryKey: ["lesson-notes", lesson.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("lesson_notes")
        .select("*").eq("lesson_id", lesson.id).eq("user_id", user!.id)
        .order("video_timestamp_seconds", { ascending: true, nullsFirst: true });
      if (error) throw error; return data || [];
    },
  });
  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteDraft.trim()) return;
      const { error } = await sb.from("lesson_notes").insert({
        user_id: user!.id, lesson_id: lesson.id, content: noteDraft.trim(),
        video_timestamp_seconds: withTimestamp ? Math.floor(getCurrentVideoTime()) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setNoteDraft(""); setWithTimestamp(false); qc.invalidateQueries({ queryKey: ["lesson-notes", lesson.id] }); },
    onError: (e: any) => toast({ title: "Could not save note", description: e.message, variant: "destructive" }),
  });
  const deleteNote = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("lesson_notes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-notes", lesson.id] }),
  });

  // ===== Announcements =====
  const { data: announcements = [] } = useQuery({
    queryKey: ["course-announcements", course.id],
    queryFn: async () => {
      const { data, error } = await sb.from("course_announcements")
        .select("*").eq("course_id", course.id).order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
  });
  const { data: reads = [] } = useQuery({
    queryKey: ["announcement-reads", course.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("announcement_reads").select("announcement_id").eq("user_id", user!.id);
      if (error) throw error; return (data || []).map((r: any) => r.announcement_id);
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await sb.from("announcement_reads").upsert({ user_id: user!.id, announcement_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement-reads", course.id] }),
  });

  const [annOpen, setAnnOpen] = useState(false);
  const [annEditing, setAnnEditing] = useState<any>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const openAnnDialog = (a?: any) => {
    setAnnEditing(a || null);
    setAnnTitle(a?.title || "");
    setAnnBody(a?.body || "");
    setAnnOpen(true);
  };
  const saveAnnouncement = useMutation({
    mutationFn: async () => {
      if (!annTitle.trim() || !annBody.trim()) return;
      if (annEditing) {
        const { error } = await sb.from("course_announcements")
          .update({ title: annTitle.trim(), body: annBody.trim() }).eq("id", annEditing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("course_announcements").insert({
          course_id: course.id, author_id: user!.id, title: annTitle.trim(), body: annBody.trim(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setAnnOpen(false); setAnnEditing(null); setAnnTitle(""); setAnnBody("");
      qc.invalidateQueries({ queryKey: ["course-announcements", course.id] });
      toast({ title: "Announcement saved" });
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("course_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-announcements", course.id] }),
  });

  // ===== Resources =====
  const { data: resources = [] } = useQuery({
    queryKey: ["lesson-resources", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("lesson_resources").select("*").eq("lesson_id", lesson.id).order("created_at");
      if (error) throw error; return data || [];
    },
  });

  const [resOpen, setResOpen] = useState(false);
  const [resName, setResName] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);
  const [resLink, setResLink] = useState("");
  const [resBusy, setResBusy] = useState(false);
  const [previewing, setPreviewing] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openResDialog = () => { setResName(""); setResFile(null); setResLink(""); setResOpen(true); };

  const submitResource = async () => {
    if (!resName.trim() || (!resFile && !resLink.trim())) {
      toast({ title: "Add a file or link", variant: "destructive" }); return;
    }
    setResBusy(true);
    try {
      let file_url = resLink.trim();
      let resource_type: ResourceType = "link";
      let file_size_mb: number | null = null;
      if (resFile) {
        const path = `${course.id}/${lesson.id}/${crypto.randomUUID()}-${resFile.name}`;
        const { error: upErr } = await sb.storage.from("lesson-resources").upload(path, resFile, { upsert: false });
        if (upErr) throw upErr;
        file_url = path;
        resource_type = detectType(resFile.name);
        file_size_mb = +(resFile.size / 1024 / 1024).toFixed(2);
      }
      const { error } = await sb.from("lesson_resources").insert({
        lesson_id: lesson.id, name: resName.trim(), file_url, resource_type, file_size_mb,
      });
      if (error) throw error;
      setResOpen(false);
      qc.invalidateQueries({ queryKey: ["lesson-resources", lesson.id] });
      toast({ title: "Resource added" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setResBusy(false); }
  };

  const deleteResource = useMutation({
    mutationFn: async (r: any) => {
      if (r.resource_type !== "link" && r.file_url && !r.file_url.startsWith("http")) {
        await sb.storage.from("lesson-resources").remove([r.file_url]);
      }
      const { error } = await sb.from("lesson_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-resources", lesson.id] }),
  });

  const resolveUrl = async (r: any): Promise<string> => {
    if (!r.file_url) return "";
    if (r.file_url.startsWith("http")) return r.file_url;
    const { data, error } = await sb.storage.from("lesson-resources").createSignedUrl(r.file_url, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  const handleDownload = async (r: any) => {
    try {
      const url = await resolveUrl(r);
      const a = document.createElement("a");
      a.href = url; a.download = r.name; a.target = "_blank"; a.rel = "noreferrer";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };
  const handlePreview = async (r: any) => {
    try {
      const url = await resolveUrl(r);
      setPreviewUrl(url); setPreviewing(r);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    }
  };
  const canPreview = (t: string) => ["pdf", "image", "video", "audio", "link"].includes(t);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent h-auto p-0 gap-2 sm:gap-4">
        {["overview", /* "notes", "activities", */ "announcements", "resources"].map(t => (
          <TabsTrigger
            key={t}
            value={t}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#B91C1C] data-[state=active]:text-[#B91C1C] data-[state=active]:bg-transparent py-3 px-2 capitalize text-sm font-medium"
          >
            {t}
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

      {/* Notes — temporarily disabled */}
      {false && (
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
      )}

      {/* Activities — temporarily disabled (duplicates lesson stages + sidebar) */}
      {false && (
      <TabsContent value="activities" className="pt-4 space-y-3">
        {!hasActivities ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No quizzes or assignments for this lesson.</p>
        ) : (
          <>
            {lessonQuizzes.map((q: any) => {
              const att = quizAttempts.filter((a: any) => a.quiz_id === q.id);
              const passed = att.some((a: any) => a.passed);
              const used = att.length;
              return (
                <Card key={q.id}><CardContent className="p-4 flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-[#B91C1C] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{q.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.questions?.length || 0} questions · Passing {q.passing_score}%
                      {q.max_attempts ? ` · ${used}/${q.max_attempts} attempts` : ""}
                    </p>
                  </div>
                  {passed && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Passed</Badge>}
                  <Link href={`/quiz/${q.id}`}>
                    <Button size="sm" className="bg-[#B91C1C] hover:bg-[#A01818]">
                      <Play className="h-4 w-4 mr-1" />{passed ? "Retake" : used > 0 ? "Continue" : "Start"}
                    </Button>
                  </Link>
                </CardContent></Card>
              );
            })}
            {lessonAssignments.map((a: any) => {
              const sub = assignmentSubs.find((s: any) => s.assignment_id === a.id);
              return (
                <Card key={a.id}><CardContent className="p-4 flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-[#B91C1C] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Max {a.max_score} pts{a.due_date ? ` · Due ${new Date(a.due_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {sub?.graded_at && <Badge className="bg-blue-600 text-white border-0">{sub.score}/{a.max_score}</Badge>}
                  {sub && !sub.graded_at && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Submitted</Badge>}
                  <Button size="sm" className="bg-[#B91C1C] hover:bg-[#A01818]" onClick={() => setSubmitFor(a)}>
                    <Send className="h-4 w-4 mr-1" />{sub ? "View" : "Submit"}
                  </Button>
                </CardContent></Card>
              );
            })}
          </>
        )}
        <AssignmentSubmitDialog open={!!submitFor} onOpenChange={(o) => !o && setSubmitFor(null)} assignment={submitFor} />
      </TabsContent>

      {/* Announcements */}
      <TabsContent value="announcements" className="pt-4 space-y-3">
        {isInstructor && (
          <div className="flex justify-end">
            <Button className="bg-[#B91C1C] hover:bg-[#A01818]" onClick={() => openAnnDialog()}>
              <Plus className="h-4 w-4 mr-1" />New announcement
            </Button>
          </div>
        )}
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
                  {isInstructor && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAnnDialog(a)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this announcement?")) deleteAnnouncement.mutate(a.id); }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
              </CardContent>
            </Card>
          );
        })}

        <Dialog open={annOpen} onOpenChange={setAnnOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{annEditing ? "Edit announcement" : "New announcement"}</DialogTitle></DialogHeader>
            <Input placeholder="Title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
            <Textarea placeholder="Message..." value={annBody} onChange={e => setAnnBody(e.target.value)} className="min-h-[140px]" />
            <DialogFooter>
              <Button onClick={() => saveAnnouncement.mutate()} disabled={!annTitle.trim() || !annBody.trim() || saveAnnouncement.isPending}>
                {saveAnnouncement.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {annEditing ? "Save changes" : "Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Resources */}
      <TabsContent value="resources" className="pt-4 space-y-2">
        {isInstructor && (
          <div className="flex justify-end">
            <Dialog open={resOpen} onOpenChange={setResOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#B91C1C] hover:bg-[#A01818]" onClick={openResDialog}>
                  <Plus className="h-4 w-4 mr-1" />Add resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add resource</DialogTitle></DialogHeader>
                <Input placeholder="Display name" value={resName} onChange={e => setResName(e.target.value)} />
                <div className="space-y-1">
                  <label className="text-sm font-medium">File</label>
                  <Input type="file" onChange={e => setResFile(e.target.files?.[0] || null)} />
                </div>
                <div className="text-center text-xs text-muted-foreground">— or —</div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">External link</label>
                  <Input placeholder="https://..." value={resLink} onChange={e => setResLink(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={submitResource} disabled={resBusy}>
                    {resBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No downloadable resources for this lesson.</p>
        ) : resources.map((r: any) => (
          <Card key={r.id}><CardContent className="p-4 flex items-center gap-3">
            <ResourceIcon type={r.resource_type} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{(r.resource_type || "file").toUpperCase()}{r.file_size_mb ? ` · ${r.file_size_mb} MB` : ""}</p>
            </div>
            {canPreview(r.resource_type) && (
              <Button size="sm" variant="ghost" onClick={() => handlePreview(r)}>
                <Eye className="h-4 w-4 mr-1" />Preview
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => handleDownload(r)}>
              <Download className="h-4 w-4 mr-1" />Download
            </Button>
            {isInstructor && (
              <Button size="icon" variant="ghost" className="text-destructive"
                onClick={() => { if (confirm("Delete this resource?")) deleteResource.mutate(r); }}
                aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardContent></Card>
        ))}

        <Dialog open={!!previewing} onOpenChange={(o) => { if (!o) { setPreviewing(null); setPreviewUrl(null); } }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle className="truncate">{previewing?.name}</DialogTitle></DialogHeader>
            {previewing && previewUrl && (
              <div className="w-full">
                {previewing.resource_type === "image" && <img src={previewUrl} alt={previewing.name} className="max-h-[70vh] mx-auto" />}
                {previewing.resource_type === "video" && <video src={previewUrl} controls className="w-full max-h-[70vh]" />}
                {previewing.resource_type === "audio" && <audio src={previewUrl} controls className="w-full" />}
                {previewing.resource_type === "pdf" && <iframe src={previewUrl} className="w-full h-[70vh]" title={previewing.name} />}
                {previewing.resource_type === "link" && (
                  <div className="text-center py-6">
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-[#B91C1C] underline break-all">{previewUrl}</a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Q&A — temporarily hidden
      ... Q&A UI removed. Restore from git history when re-enabling. ...
      */}
    </Tabs>
  );
}
