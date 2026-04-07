/**
 * Admin Courses Table
 * Enhanced courses table with lifecycle statuses, capacity bars, and course completion
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  MoreVertical,
  Eye,
  Download,
  Mail,
  Lock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Archive,
  Award,
} from "lucide-react";

interface CourseWithEnrollments {
  id: string;
  title: string;
  is_published: boolean;
  total_capacity: number | null;
  created_at: string;
  level: string;
  price: number;
  currency: string;
  enrollment_count: number;
  cohort_id?: string | null;
  course_status?: string | null;
  instructor?: { first_name: string | null; last_name: string | null } | null;
  confirmedCount: number;
  pendingCount: number;
  revenue: number;
}

type CourseTab = "all" | "draft" | "registration_open" | "live" | "completed";

const LIFECYCLE_STATUSES = [
  { value: "draft", label: "Draft", icon: BookOpen, color: "text-muted-foreground" },
  { value: "registration_open", label: "Registration Open", icon: Play, color: "text-blue-600" },
  { value: "live", label: "Live", icon: CheckCircle2, color: "text-green-600" },
  { value: "completed", label: "Completed", icon: Archive, color: "text-amber-600" },
] as const;

function CapacityBar({ enrolled, capacity }: { enrolled: number; capacity: number | null }) {
  if (!capacity || capacity === 0) {
    return <span className="text-xs text-muted-foreground">No cap</span>;
  }
  const pct = Math.min(100, Math.round((enrolled / capacity) * 100));
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 50 ? "bg-green-500" : pct >= 30 ? "bg-amber-500" : "bg-amber-400";

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono whitespace-nowrap">{enrolled}/{capacity}</span>
    </div>
  );
}

function statusBadge(course: CourseWithEnrollments) {
  const status = course.course_status || (course.is_published ? "registration_open" : "draft");
  
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Draft
        </Badge>
      );
    case "registration_open":
      if (course.total_capacity && course.confirmedCount >= course.total_capacity) {
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">Sold Out</Badge>
        );
      }
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-pulse" />
          Registration Open
        </Badge>
      );
    case "live":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
          Live
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Archive className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminCoursesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CourseTab>("all");
  const [bulkEmailCourse, setBulkEmailCourse] = useState<CourseWithEnrollments | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [completionDialog, setCompletionDialog] = useState<CourseWithEnrollments | null>(null);

  // Fetch courses with instructor
  const { data: rawCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses-enhanced"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, instructor:users!courses_instructor_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all enrollments for per-course stats
  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["admin-all-enrollments-courses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("course_id, payment_status, ticket_price");
      if (error) throw error;
      return data || [];
    },
  });

  // Compute enriched courses
  const courses: CourseWithEnrollments[] = rawCourses.map((c: any) => {
    const courseEnr = allEnrollments.filter((e: any) => e.course_id === c.id);
    const confirmed = courseEnr.filter((e: any) => e.payment_status === "confirmed");
    const pending = courseEnr.filter(
      (e: any) => e.payment_status === "pending_bank" || e.payment_status === "pending_invoice"
    );
    const revenue = confirmed.reduce((sum: number, e: any) => sum + Number(e.ticket_price || 0), 0);
    return { ...c, confirmedCount: confirmed.length, pendingCount: pending.length, revenue };
  });

  // Resolve effective status
  const getEffectiveStatus = (c: CourseWithEnrollments) =>
    c.course_status || (c.is_published ? "registration_open" : "draft");

  // Filter
  const filtered = courses.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchesSearch;
    return matchesSearch && getEffectiveStatus(c) === tab;
  });

  // Count by status
  const countByStatus = (status: string) =>
    courses.filter((c) => getEffectiveStatus(c) === status).length;

  // Update course status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const isPublished = status === "registration_open" || status === "live";
      const { error } = await supabase
        .from("courses")
        .update({ course_status: status, is_published: isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses-enhanced"] });
      toast({ title: "Course status updated" });
    },
  });

  // Mark course as completed
  const completeCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("courses")
        .update({ course_status: "completed", is_published: false })
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses-enhanced"] });
      toast({ title: "Course marked as completed", description: "Certificates can now be issued to participants." });
      setCompletionDialog(null);
    },
  });

  // Export enrollments CSV
  const exportCourseCSV = (courseId: string, courseTitle: string) => {
    const courseEnr = allEnrollments.filter((e: any) => e.course_id === courseId);
    const headers = ["Payment Status", "Ticket Price"];
    const rows = courseEnr.map((e: any) => [e.payment_status, e.ticket_price]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseTitle.replace(/\s+/g, "-")}-enrollments.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Management</h2>
      </div>

      {/* Status Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as CourseTab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({courses.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({countByStatus("draft")})</TabsTrigger>
          <TabsTrigger value="registration_open">Registration ({countByStatus("registration_open")})</TabsTrigger>
          <TabsTrigger value="live">Live ({countByStatus("live")})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({countByStatus("completed")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {coursesLoading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Course</th>
                <th className="text-left p-3 font-medium">Cohort</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Instructor</th>
                <th className="text-left p-3 font-medium">Capacity</th>
                <th className="text-right p-3 font-medium">Enrolled</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">Pending</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const effectiveStatus = getEffectiveStatus(c);
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium max-w-[250px] truncate">{c.title}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{c.cohort_id || "—"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {c.instructor?.first_name} {c.instructor?.last_name}
                    </td>
                    <td className="p-3">
                      <CapacityBar enrolled={c.confirmedCount} capacity={c.total_capacity} />
                    </td>
                    <td className="p-3 text-right font-medium">{c.confirmedCount}</td>
                    <td className="p-3 text-right hidden lg:table-cell text-amber-600">{c.pendingCount || "—"}</td>
                    <td className="p-3 text-right font-medium">GHS {c.revenue.toLocaleString()}</td>
                    <td className="p-3">{statusBadge(c)}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/course/${c.id}`, "_blank")}>
                            <Eye className="h-4 w-4 mr-2" /> View Course
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportCourseCSV(c.id, c.title)}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBulkEmailCourse(c)}>
                            <Mail className="h-4 w-4 mr-2" /> Send Bulk Email
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Lifecycle Status Controls */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Play className="h-4 w-4 mr-2" /> Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {LIFECYCLE_STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  disabled={effectiveStatus === s.value}
                                  onClick={() => {
                                    if (s.value === "completed") {
                                      setCompletionDialog(c);
                                    } else {
                                      updateStatus.mutate({ id: c.id, status: s.value });
                                    }
                                  }}
                                >
                                  <s.icon className={`h-4 w-4 mr-2 ${s.color}`} />
                                  {s.label}
                                  {effectiveStatus === s.value && (
                                    <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          {effectiveStatus === "completed" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                toast({
                                  title: "Certificate generation",
                                  description: "Certificates of attendance will be generated for all confirmed participants.",
                                });
                              }}>
                                <Award className="h-4 w-4 mr-2" /> Issue Certificates
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Course Completion Confirmation Dialog */}
      <Dialog open={!!completionDialog} onOpenChange={() => setCompletionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Mark Course as Completed
            </DialogTitle>
            <DialogDescription>
              This will close registration and mark <strong>{completionDialog?.title}</strong> as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-muted space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed participants</span>
                <span className="font-medium">{completionDialog?.confirmedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending payments</span>
                <span className="font-medium text-amber-600">{completionDialog?.pendingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total revenue</span>
                <span className="font-medium">GHS {completionDialog?.revenue.toLocaleString()}</span>
              </div>
            </div>
            {(completionDialog?.pendingCount ?? 0) > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                There are still {completionDialog?.pendingCount} pending payments. They will remain as pending.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              After completion, you can issue certificates of attendance to all confirmed participants.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialog(null)}>Cancel</Button>
            <Button
              onClick={() => completionDialog && completeCourse.mutate(completionDialog.id)}
              disabled={completeCourse.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              {completeCourse.isPending ? "Processing..." : "Mark as Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={!!bulkEmailCourse} onOpenChange={() => setBulkEmailCourse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Bulk Email — {bulkEmailCourse?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject..." />
            </div>
            <div>
              <label className="text-sm font-medium">Body</label>
              <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} placeholder="Write your message..." />
            </div>
            <p className="text-xs text-muted-foreground">
              This will send to all confirmed enrollees of this course. Email delivery requires a configured email domain.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEmailCourse(null)}>Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Email sending requires email domain setup",
                description: "Configure your email domain in Cloud → Emails first.",
              });
              setBulkEmailCourse(null);
            }}>
              <Mail className="h-4 w-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
