import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
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
  const cls = "h-5 w-5 text-destructive shrink-0";
  const getAriaLabel = (type: string) => {
    switch (type) {
      case "pdf": return "PDF document";
      case "doc": return "Document";
      case "xls": return "Spreadsheet";
      case "ppt": return "Presentation";
      case "zip": return "Archive file";
      case "image": return "Image file";
      case "video": return "Video file";
      case "audio": return "Audio file";
      case "link": return "External link";
      default: return "File";
    }
  };
  
  const IconComponent = (() => {
    switch (type) {
      case "pdf":
      case "doc": return FileText;
      case "xls": return FileSpreadsheet;
      case "ppt": return Presentation;
      case "zip": return FileArchive;
      case "image": return ImageIcon;
      case "video": return VideoIcon;
      case "audio": return Music;
      case "link": return Link2;
      default: return FileIcon;
    }
  })();
  
  return <IconComponent className={cls} aria-label={getAriaLabel(type)} />;
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
        const path = `${course.instructor_id}/${course.id}/${lesson.id}/${crypto.randomUUID()}-${resFile.name}`;
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
    <Tabs defaultValue="transcript" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b border-[#D1CEC7] bg-transparent h-auto p-0 gap-0" role="tablist">
        {["transcript", "overview", "announcements", "resources"].map(t => (
          <TabsTrigger
            key={t}
            value={t}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#5A2633] data-[state=active]:text-[#5A2633] data-[state=active]:bg-transparent py-3 px-6 capitalize text-sm font-medium text-[#6B6761] hover:text-[#252525] hover:bg-[#F5F1E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            role="tab"
            aria-selected={false}
          >
            {t === "transcript" ? "Transcript" : t}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Transcript Tab - Official CIMA Light Theme */}
      <TabsContent value="transcript" className="pt-6" role="tabpanel">
        <div className="space-y-4">
          {lesson.transcript && Array.isArray(lesson.transcript) && lesson.transcript.length > 0 ? (
            <>
              <div className="text-sm text-[#4A4A4A] leading-relaxed space-y-4 bg-white p-6 rounded-lg border border-[#E8E4DC] shadow-sm">
                {lesson.transcript.map((entry: any, index: number) => (
                  <p key={index} className="flex items-start gap-3">
                    <span className="font-mono text-[#B49A67] text-xs mt-1 font-semibold whitespace-nowrap">
                      {entry.timestamp || entry.time || "0:00"}
                    </span>
                    <span>{entry.text || entry.content || ""}</span>
                  </p>
                ))}
              </div>
              <div className="pt-4 border-t border-[#E8E4DC]">
                <p className="text-xs text-[#6B6761]">
                  Transcript generated from lesson audio
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center bg-white rounded-lg border border-[#E8E4DC] shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#F5F1E8] border border-[#E8E4DC] flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-[#B49A67]" />
              </div>
              <p className="text-sm text-[#6B6761] mb-2">No transcript available yet</p>
              <p className="text-xs text-[#6B6761] max-w-md mx-auto">
                Transcripts are generated automatically when videos are processed. Check back later.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Overview - Official CIMA Light Theme */}
      <TabsContent value="overview" className="pt-6" role="tabpanel">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-[#E8E4DC] p-6 shadow-sm hover:shadow-md hover:border-[#B49A67]/50 transition-all">
            <h3 className="text-lg font-semibold text-[#252525] mb-3 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#5A2633]"></div>
              About this course
            </h3>
            <p className="text-sm text-[#4A4A4A] leading-relaxed whitespace-pre-line">{course.description || "No description available."}</p>
          </section>
          
          {moduleTitle && (
            <section className="bg-gradient-to-r from-[#F5F1E8] to-white rounded-lg border border-[#B49A67]/30 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#252525] mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#B49A67]"></div>
                Current section
              </h3>
              <p className="text-sm text-[#5A2633] font-medium">{moduleTitle}</p>
            </section>
          )}
          
          {lesson.description && (
            <section className="bg-white rounded-lg border border-[#E8E4DC] p-6 shadow-sm hover:shadow-md hover:border-[#B49A67]/50 transition-all">
              <h3 className="text-lg font-semibold text-[#252525] mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#5A2633]"></div>
                About this lesson
              </h3>
              <p className="text-sm text-[#4A4A4A] leading-relaxed whitespace-pre-line">{lesson.description}</p>
            </section>
          )}
        </div>
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
                  <HelpCircle className="h-5 w-5 text-[#5A2633] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{q.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.questions?.length || 0} questions · Passing {q.passing_score}%
                      {q.max_attempts ? ` · ${used}/${q.max_attempts} attempts` : ""}
                    </p>
                  </div>
                  {passed && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Passed</Badge>}
                  <Link href={`/quiz/${q.id}`}>
                    <Button size="sm" className="bg-[#5A2633] hover:bg-[#4a1f29]">
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
                  <ClipboardList className="h-5 w-5 text-[#5A2633] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Max {a.max_score} pts{a.due_date ? ` · Due ${new Date(a.due_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {sub?.graded_at && <Badge className="bg-blue-600 text-white border-0">{sub.score}/{a.max_score}</Badge>}
                  {sub && !sub.graded_at && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Submitted</Badge>}
                  <Button size="sm" className="bg-[#5A2633] hover:bg-[#4a1f29]" onClick={() => setSubmitFor(a)}>
                    <Send className="h-4 w-4 mr-1" />{sub ? "View" : "Submit"}
                  </Button>
                </CardContent></Card>
              );
            })}
          </>
        )}
        <AssignmentSubmitDialog open={!!submitFor} onOpenChange={(o) => !o && setSubmitFor(null)} assignment={submitFor} />
      </TabsContent>
      )}

      {/* Announcements - Official CIMA Light Theme */}
      <TabsContent value="announcements" className="pt-6 space-y-4" role="tabpanel">
        {isInstructor && (
          <div className="flex justify-end">
            <Button className="bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-sm hover:shadow-md transition-all" onClick={() => openAnnDialog()}>
              <Plus className="h-4 w-4 mr-2" />New announcement
            </Button>
          </div>
        )}
        {announcements.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#F5F1E8] border border-[#E8E4DC] flex items-center justify-center mb-4">
              <HelpCircle className="h-8 w-8 text-[#B49A67]" />
            </div>
            <p className="text-sm text-[#6B6761]">No announcements yet.</p>
          </div>
        ) : announcements.map((a: any) => {
          const unread = !reads.includes(a.id);
          return (
            <Card key={a.id} onClick={() => unread && markRead.mutate(a.id)} className="hover:shadow-md transition-shadow border border-[#E8E4DC] hover:border-[#B49A67]/50 bg-white">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  {unread && <span className="h-2.5 w-2.5 rounded-full bg-[#5A2633]" aria-label="Unread announcement" />}
                  <h4 className="font-semibold text-[#252525] flex-1">{a.title}</h4>
                  <span className="text-xs text-[#6B6761]">{new Date(a.created_at).toLocaleDateString()}</span>
                  {isInstructor && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()} role="group" aria-label="Announcement actions">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 hover:bg-[#F5F1E8] text-[#5A2633]" 
                        onClick={() => openAnnDialog(a)} 
                        aria-label="Edit announcement"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => { if (confirm("Delete this announcement?")) deleteAnnouncement.mutate(a.id); }} 
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#4A4A4A] leading-relaxed whitespace-pre-line">{a.body}</p>
              </CardContent>
            </Card>
          );
        })}

        <Dialog open={annOpen} onOpenChange={setAnnOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg bg-white border-[#E8E4DC]" onEscapeKeyDown={() => setAnnOpen(false)}>
            <DialogHeader>
              <DialogTitle className="text-[#252525]">{annEditing ? "Edit announcement" : "New announcement"}</DialogTitle>
              <DialogDescription className="text-[#6B6761]">
                {annEditing ? "Edit the announcement title and message for your course." : "Create a new announcement to share with your course participants."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="announcement-title" className="text-sm font-medium text-[#252525]">Title</label>
                <Input 
                  id="announcement-title"
                  placeholder="Enter announcement title" 
                  value={annTitle} 
                  onChange={e => setAnnTitle(e.target.value)} 
                  aria-required="true"
                  className="mt-1 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761]"
                />
              </div>
              <div>
                <label htmlFor="announcement-body" className="text-sm font-medium text-[#252525]">Message</label>
                <Textarea 
                  id="announcement-body"
                  placeholder="Enter your message..." 
                  value={annBody} 
                  onChange={e => setAnnBody(e.target.value)} 
                  className="min-h-[140px] mt-1 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761]"
                  aria-required="true"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => saveAnnouncement.mutate()} 
                disabled={!annTitle.trim() || !annBody.trim() || saveAnnouncement.isPending}
                className="bg-[#5A2633] hover:bg-[#3D1A22] text-white"
                aria-describedby={(!annTitle.trim() || !annBody.trim()) ? "form-error" : undefined}
              >
                {saveAnnouncement.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {annEditing ? "Save changes" : "Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Resources - Official CIMA Light Theme with Proper Styling */}
      <TabsContent value="resources" className="pt-6 space-y-4" role="tabpanel">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#252525] mb-2">Readings and materials</h3>
        </div>
        
        {isInstructor && (
          <div className="flex justify-end mb-4">
            <Dialog open={resOpen} onOpenChange={setResOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-sm hover:shadow-md transition-all" onClick={openResDialog}>
                  <Plus className="h-4 w-4 mr-2" />Add resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg bg-white border-[#E8E4DC]" onEscapeKeyDown={() => setResOpen(false)}>
                <DialogHeader>
                  <DialogTitle className="text-[#252525]">Add resource</DialogTitle>
                  <DialogDescription className="text-[#6B6761]">
                    Upload a file or provide an external link to add a learning resource for this lesson.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="resource-name" className="text-sm font-medium text-[#252525]">Display name</label>
                    <Input 
                      id="resource-name"
                      placeholder="Enter resource name" 
                      value={resName} 
                      onChange={e => setResName(e.target.value)} 
                      aria-required="true"
                      className="mt-1 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761]"
                    />
                  </div>
                  <div>
                    <label htmlFor="resource-file" className="text-sm font-medium text-[#252525]">File</label>
                    <Input 
                      id="resource-file"
                      type="file" 
                      onChange={e => setResFile(e.target.files?.[0] || null)}
                      className="mt-1 bg-white border-[#D1CEC7] text-[#252525]"
                      accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx,.key,.zip,.rar,.7z,.tar,.gz,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.m4a,.ogg,.flac"
                    />
                  </div>
                  <div className="text-center text-sm text-[#6B6761]">— or —</div>
                  <div>
                    <label htmlFor="resource-link" className="text-sm font-medium text-[#252525]">External link</label>
                    <Input 
                      id="resource-link"
                      placeholder="https://example.com/resource" 
                      value={resLink} 
                      onChange={e => setResLink(e.target.value)}
                      className="mt-1 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={submitResource} 
                    disabled={resBusy || (!resName.trim() || (!resFile && !resLink.trim()))}
                    className="bg-[#5A2633] hover:bg-[#3D1A22] text-white"
                    aria-describedby={(!resName.trim() || (!resFile && !resLink.trim())) ? "form-error" : undefined}
                  >
                    {resBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {resources.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#5A2633]/10 border border-[#E8E4DC] flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[#5A2633]" />
            </div>
            <p className="text-sm text-[#6B6761]">No downloadable resources for this lesson.</p>
          </div>
        ) : resources.map((r: any) => (
          <div key={r.id} className="bg-white border border-[#E8E4DC] rounded-lg p-5 hover:border-[#B49A67] hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              {/* File Type Badge */}
              <div className="flex-shrink-0">
                <Badge className="bg-[#5A2633] text-white border-0 text-xs font-semibold px-3 py-1.5 uppercase">
                  {r.resource_type === 'pdf' ? 'PDF' : (r.resource_type || 'FILE').toUpperCase()}
                </Badge>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[#252525] mb-1 group-hover:text-[#5A2633] transition-colors">
                  {r.name}
                </h4>
                <p className="text-sm text-[#4A4A4A] mb-1">
                  Lecture {(r.resource_type || "file").toUpperCase()} notes for CIMA Learn | demonstration video
                </p>
                <p className="text-xs text-[#6B6761]">
                  Source: Markers for CIMA Learn | Demonstration Refers to the Convention on the Recognition and Enforcement of Foreign Arbitral Awards (New York 1958)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {canPreview(r.resource_type) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handlePreview(r)}
                    className="border-[#D1CEC7] text-[#5A2633] hover:bg-[#F5F1E8] hover:border-[#B49A67] h-9"
                    aria-label={`Preview ${r.name}`}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={() => handleDownload(r)}
                  className="bg-[#C93A47] hover:bg-[#B33340] text-white border-0 h-9 shadow-sm"
                  aria-label={`Download ${r.name}`}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download PDF
                </Button>
                {isInstructor && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                    onClick={() => { if (confirm("Delete this resource?")) deleteResource.mutate(r); }}
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        <Dialog open={!!previewing} onOpenChange={(o) => { if (!o) { setPreviewing(null); setPreviewUrl(null); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl" onEscapeKeyDown={() => { setPreviewing(null); setPreviewUrl(null); }}>
            <DialogHeader>
              <DialogTitle className="truncate">{previewing?.name}</DialogTitle>
              <DialogDescription>
                Preview of the selected learning resource.
              </DialogDescription>
            </DialogHeader>
            {previewing && previewUrl && (
              <div className="w-full" role="document">
                {previewing.resource_type === "image" && (
                  <img src={previewUrl} alt={previewing.name} className="max-h-[70vh] mx-auto rounded-lg" />
                )}
                {previewing.resource_type === "video" && (
                  <video src={previewUrl} controls className="w-full max-h-[70vh] rounded-lg" aria-label={`Video: ${previewing.name}`}>
                    Your browser does not support video tag.
                  </video>
                )}
                {previewing.resource_type === "audio" && (
                  <audio src={previewUrl} controls className="w-full" aria-label={`Audio: ${previewing.name}`}>
                    Your browser does not support audio tag.
                  </audio>
                )}
                {previewing.resource_type === "pdf" && (
                  <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title={previewing.name} aria-label={`PDF document: ${previewing.name}`} />
                )}
                {previewing.resource_type === "link" && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">External link:</p>
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-destructive underline break-all hover:text-destructive/80"
                      aria-label={`Open external link: ${previewUrl}`}
                    >
                      {previewUrl}
                    </a>
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
