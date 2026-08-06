import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// Cast bypass: lesson_resources not in generated DB types yet.
const sb: any = supabase;
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

const MAX_MB = 50;

function detectType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "document";
  if (["ppt", "pptx"].includes(ext)) return "slide";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  return "file";
}

export default function InstructorResourceUpload() {
  const { user, isInstructor } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [courseId, setCourseId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = !!user?.id && isInstructor();

  const { data: courses = [] } = useQuery({
    queryKey: ["instr-res-courses", user?.id],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, instructor_id")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["instr-res-modules", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, title")
        .eq("course_id", courseId)
        .order("order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["instr-res-lessons", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title")
        .eq("module_id", moduleId)
        .order("order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["instr-res-list", lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const submit = async () => {
    if (!lessonId || !name.trim() || (!file && !link.trim())) {
      toast({ title: "Pick a lesson and provide a file or link", variant: "destructive" });
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `File exceeds ${MAX_MB}MB limit`, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      let file_url = link.trim();
      let resource_type = "link";
      let file_size_mb: number | null = null;
      if (file) {
        // Get the instructor_id from the selected course
        const selectedCourse = courses.find((c: any) => c.id === courseId);
        const instructorId = selectedCourse?.instructor_id || user!.id;
        const path = `${instructorId}/${courseId}/${lessonId}/${crypto.randomUUID()}-${file.name}`;
        console.log('Uploading to path:', path);
        console.log('instructorId:', instructorId, 'courseId:', courseId, 'lessonId:', lessonId);
        const { error: upErr } = await supabase.storage
          .from("lesson-resources")
          .upload(path, file, { upsert: false });
        if (upErr) {
          console.error('Upload error:', upErr);
          throw upErr;
        }
        file_url = path;
        resource_type = detectType(file.name);
        file_size_mb = +(file.size / 1024 / 1024).toFixed(2);
      }
      const { error } = await sb.from("lesson_resources").insert({
        lesson_id: lessonId,
        name: name.trim(),
        file_url,
        resource_type,
        file_size_mb,
      });
      if (error) throw error;
      setName("");
      setFile(null);
      setLink("");
      qc.invalidateQueries({ queryKey: ["instr-res-list", lessonId] });
      toast({ title: "Resource uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeOne = useMutation({
    mutationFn: async (r: any) => {
      if (r.resource_type !== "link" && r.file_url && !r.file_url.startsWith("http")) {
        await supabase.storage.from("lesson-resources").remove([r.file_url]);
      }
      const { error } = await sb.from("lesson_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instr-res-list", lessonId] }),
  });

  const courseSelectDisabled = useMemo(() => courses.length === 0, [courses.length]);

  if (!enabled) return null;

  return (
    <Card data-testid="resource-upload" className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Upload Lesson Resource
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Attach PDFs, slides, videos, archives, or external links to one of your lessons. Max {MAX_MB}MB per file.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setModuleId("");
                setLessonId("");
              }}
              disabled={courseSelectDisabled}
            >
              <SelectTrigger data-testid="select-course">
                <SelectValue placeholder={courseSelectDisabled ? "No courses yet" : "Select course"} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Module</Label>
            <Select
              value={moduleId}
              onValueChange={(v) => { setModuleId(v); setLessonId(""); }}
              disabled={!courseId || modules.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
              <SelectContent>
                {modules.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Lesson</Label>
            <Select
              value={lessonId}
              onValueChange={setLessonId}
              disabled={!moduleId || lessons.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select lesson" /></SelectTrigger>
              <SelectContent>
                {lessons.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="res-name">Resource name</Label>
            <Input
              id="res-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 120))}
              placeholder="e.g., Module 1 Handout"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="res-link">External link (optional)</Label>
            <Input
              id="res-link"
              value={link}
              onChange={(e) => setLink(e.target.value.slice(0, 500))}
              placeholder="https://…"
              disabled={!!file}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="res-file">File</Label>
          <Input
            id="res-file"
            type="file"
            data-testid="resource-upload-file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={!!link.trim()}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.webm,.zip,.rar,.7z,.txt"
          />
        </div>

        <Button
          onClick={submit}
          disabled={busy || !lessonId}
          className="w-full md:w-auto"
          data-testid="button-submit-resource"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload Resource
        </Button>

        {lessonId && existing.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-medium">Existing resources for this lesson</p>
            {existing.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.resource_type}{r.file_size_mb ? ` · ${r.file_size_mb}MB` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOne.mutate(r)}
                  disabled={removeOne.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
