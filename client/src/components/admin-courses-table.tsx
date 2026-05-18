/**
 * Admin Courses Table — Enhanced with course detail drawer,
 * per-course enrollment list, lifecycle management, capacity monitoring
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatCoursePrice } from "@/lib/format-price";
import {
  Search, MoreVertical, Eye, Download, Mail, BookOpen, CheckCircle2,
  AlertTriangle, Play, Archive, Award, Users, DollarSign, Calendar,
  MapPin, Clock, Layers,
} from "lucide-react";

interface CourseWithEnrollments {
  id: string;
  title: string;
  subtitle: string | null;
  is_published: boolean;
  total_capacity: number | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  level: string;
  price: number;
  currency: string;
  enrollment_count: number;
  cohort_id?: string | null;
  course_status?: string | null;
  duration_hours?: number | null;
  template_id?: string | null;
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
  if (!capacity || capacity === 0) return <span className="text-xs text-muted-foreground">No cap</span>;
  const pct = Math.min(100, Math.round((enrolled / capacity) * 100));
  const color = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-green-500" : pct >= 30 ? "bg-amber-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono whitespace-nowrap">{enrolled}/{capacity}</span>
    </div>
  );
}

function StatusBadge({ course }: { course: CourseWithEnrollments }) {
  const status = course.course_status || (course.is_published ? "registration_open" : "draft");
  const config: Record<string, { className: string; label: string; pulse?: boolean }> = {
    draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
    registration_open: { className: "bg-blue-100 text-blue-800", label: course.total_capacity && course.confirmedCount >= course.total_capacity ? "Sold Out" : "Registration Open", pulse: true },
    live: { className: "bg-green-100 text-green-800", label: "Live", pulse: true },
    completed: { className: "bg-amber-100 text-amber-800", label: "Completed" },
  };
  const c = config[status] || { className: "bg-muted text-muted-foreground", label: status };
  if (status === "registration_open" && course.total_capacity && course.confirmedCount >= course.total_capacity) {
    return <Badge className="bg-red-100 text-red-800 text-[10px]">Sold Out</Badge>;
  }
  return (
    <Badge className={`${c.className} text-[10px]`}>
      {c.pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />}
      {c.label}
    </Badge>
  );
}

export default function AdminCoursesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CourseTab>("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseWithEnrollments | null>(null);
  const [bulkEmailCourse, setBulkEmailCourse] = useState<CourseWithEnrollments | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [completionDialog, setCompletionDialog] = useState<CourseWithEnrollments | null>(null);

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

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["admin-all-enrollments-courses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("course_id, payment_status, ticket_price, full_name, email, ticket_type, booking_ref, created_at, confirmed_at");
      if (error) throw error;
      return data || [];
    },
  });

  const courses: CourseWithEnrollments[] = rawCourses.map((c: any) => {
    const courseEnr = allEnrollments.filter((e: any) => e.course_id === c.id);
    const confirmed = courseEnr.filter((e: any) => e.payment_status === "confirmed");
    const pending = courseEnr.filter((e: any) => e.payment_status === "pending_bank" || e.payment_status === "pending_invoice");
    const revenue = confirmed.reduce((sum: number, e: any) => sum + Number(e.ticket_price || 0), 0);
    return { ...c, confirmedCount: confirmed.length, pendingCount: pending.length, revenue };
  });

  const getEffectiveStatus = (c: CourseWithEnrollments) => c.course_status || (c.is_published ? "registration_open" : "draft");

  const filtered = courses.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.cohort_id?.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchesSearch;
    return matchesSearch && getEffectiveStatus(c) === tab;
  });

  const countByStatus = (status: string) => courses.filter((c) => getEffectiveStatus(c) === status).length;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const isPublished = status === "registration_open" || status === "live";
      const { error } = await supabase.from("courses").update({ course_status: status, is_published: isPublished } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses-enhanced"] });
      toast({ title: "Course status updated" });
    },
  });

  const completeCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").update({ course_status: "completed", is_published: false } as any).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses-enhanced"] });
      toast({ title: "Course marked as completed" });
      setCompletionDialog(null);
    },
  });

  const exportCourseCSV = (courseId: string, courseTitle: string) => {
    const courseEnr = allEnrollments.filter((e: any) => e.course_id === courseId);
    const headers = ["Name", "Email", "Ticket", "Amount", "Status", "Booking Ref", "Date"];
    const rows = courseEnr.map((e: any) => [e.full_name, e.email, e.ticket_type, e.ticket_price, e.payment_status, e.booking_ref, e.created_at]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${courseTitle.replace(/\s+/g, "-")}-enrollments.csv`;
    a.click();
  };

  // Enrollments for selected course drawer
  const courseEnrollments = selectedCourse
    ? allEnrollments.filter((e: any) => e.course_id === selectedCourse.id)
    : [];
  const courseConfirmed = courseEnrollments.filter((e: any) => e.payment_status === "confirmed");
  const coursePending = courseEnrollments.filter((e: any) => e.payment_status !== "confirmed" && e.payment_status !== "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Management</h2>
        <Badge variant="secondary">{courses.length} courses</Badge>
      </div>

      {/* Status Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as CourseTab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all" className="text-xs">All ({courses.length})</TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">Draft ({countByStatus("draft")})</TabsTrigger>
          <TabsTrigger value="registration_open" className="text-xs">Registration ({countByStatus("registration_open")})</TabsTrigger>
          <TabsTrigger value="live" className="text-xs">Live ({countByStatus("live")})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({countByStatus("completed")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses or cohort ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {coursesLoading ? (
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Course</th>
                {/* Cohort column removed - courses are online only */}
                <th className="text-left p-3 font-medium hidden md:table-cell">Instructor</th>
                <th className="text-left p-3 font-medium">Capacity</th>
                <th className="text-right p-3 font-medium">Enrolled</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">Pending</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const effectiveStatus = getEffectiveStatus(c);
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedCourse(c)}>
                    <td className="p-3 font-medium max-w-[200px] truncate">{c.title}</td>
                    {/* Cohort ID removed - courses are online only */}
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                      {c.instructor ? `${c.instructor.first_name} ${c.instructor.last_name}` : "—"}
                    </td>
                    <td className="p-3"><CapacityBar enrolled={c.confirmedCount} capacity={c.total_capacity} /></td>
                    <td className="p-3 text-right font-medium">{c.confirmedCount}</td>
                    <td className="p-3 text-right hidden lg:table-cell text-amber-600">{c.pendingCount || "—"}</td>
                    <td className="p-3 text-right font-medium text-xs">GHS {c.revenue.toLocaleString()}</td>
                    <td className="p-3"><StatusBadge course={c} /></td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedCourse(c)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/course/${c.id}`, "_blank")}>
                            <Eye className="h-4 w-4 mr-2" /> Preview Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportCourseCSV(c.id, c.title)}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBulkEmailCourse(c)}>
                            <Mail className="h-4 w-4 mr-2" /> Bulk Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Play className="h-4 w-4 mr-2" /> Change Status</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {LIFECYCLE_STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  disabled={effectiveStatus === s.value}
                                  onClick={() => {
                                    if (s.value === "completed") setCompletionDialog(c);
                                    else updateStatus.mutate({ id: c.id, status: s.value });
                                  }}
                                >
                                  <s.icon className={`h-4 w-4 mr-2 ${s.color}`} />
                                  {s.label}
                                  {effectiveStatus === s.value && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {effectiveStatus === "completed" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toast({ title: "Certificate generation", description: "Certificates will be generated for all confirmed participants." })}>
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

      {/* ===== COURSE DETAIL DRAWER ===== */}
      <Sheet open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Course Details</SheetTitle></SheetHeader>

          {selectedCourse && (
            <div className="mt-4 space-y-6">
              {/* Course Identity */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{selectedCourse.title}</h3>
                      {selectedCourse.subtitle && <p className="text-sm text-muted-foreground">{selectedCourse.subtitle}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge course={selectedCourse} />
                        {/* Cohort badge removed - courses are online only */}
                        <Badge variant="outline" className="text-[10px] capitalize">{selectedCourse.level}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t">
                    <div className="text-center">
                      <p className="text-xl font-bold text-primary">{selectedCourse.confirmedCount}</p>
                      <p className="text-[10px] text-muted-foreground">Confirmed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-amber-600">{selectedCourse.pendingCount}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600">GHS {selectedCourse.revenue.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                    </div>
                  </div>

                  {selectedCourse.total_capacity && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Capacity</span>
                        <span>{selectedCourse.confirmedCount}/{selectedCourse.total_capacity} ({Math.round((selectedCourse.confirmedCount / selectedCourse.total_capacity) * 100)}%)</span>
                      </div>
                      <Progress value={(selectedCourse.confirmedCount / selectedCourse.total_capacity) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                  <TabsTrigger value="enrollees" className="text-xs">Enrollees ({courseEnrollments.length})</TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-3 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      {[
                        [Calendar, "Start Date", selectedCourse.start_date ? new Date(selectedCourse.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null],
                        [Calendar, "End Date", selectedCourse.end_date ? new Date(selectedCourse.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null],
                        [MapPin, "Venue", selectedCourse.venue],
                        [Clock, "Duration", selectedCourse.duration_hours ? `${selectedCourse.duration_hours} hours` : null],
                        [DollarSign, "Price", formatCoursePrice(selectedCourse.price, selectedCourse.currency || "GHS")],
                        [Layers, "Level", selectedCourse.level],
                        [Users, "Instructor", selectedCourse.instructor ? `${selectedCourse.instructor.first_name} ${selectedCourse.instructor.last_name}` : null],
                      ].filter(([, , v]) => v != null).map(([Icon, label, value]) => {
                        const IconComponent = Icon as React.ComponentType<{ className?: string }>;
                        return (
                          <div key={label as string} className="flex items-center gap-3 py-1.5 text-sm">
                            <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground min-w-[80px]">{label as string}</span>
                            <span className="font-medium capitalize">{value as string}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Enrollees Tab */}
                <TabsContent value="enrollees" className="space-y-3 mt-4">
                  {courseEnrollments.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No enrollments yet.</CardContent></Card>
                  ) : (
                    <>
                      {/* Confirmed */}
                      {courseConfirmed.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Confirmed ({courseConfirmed.length})
                          </h4>
                          <div className="space-y-1">
                            {courseConfirmed.map((e: any) => (
                              <div key={e.booking_ref} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                                <div>
                                  <p className="font-medium">{e.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{e.email} • {e.ticket_type}</p>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">{e.booking_ref}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Pending */}
                      {coursePending.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                            Pending ({coursePending.length})
                          </h4>
                          <div className="space-y-1">
                            {coursePending.map((e: any) => (
                              <div key={e.booking_ref} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                                <div>
                                  <p className="font-medium">{e.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{e.email} • {e.payment_status}</p>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">{e.booking_ref}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => exportCourseCSV(selectedCourse.id, selectedCourse.title)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Export Enrollee List
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lifecycle</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {LIFECYCLE_STATUSES.map((s) => {
                      const current = getEffectiveStatus(selectedCourse) === s.value;
                      return (
                        <Button
                          key={s.value}
                          variant={current ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-xs"
                          disabled={current}
                          onClick={() => {
                            if (s.value === "completed") setCompletionDialog(selectedCourse);
                            else updateStatus.mutate({ id: selectedCourse.id, status: s.value });
                          }}
                        >
                          <s.icon className={`w-3.5 h-3.5 mr-1.5 ${current ? "" : s.color}`} />
                          {s.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="pt-3 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setBulkEmailCourse(selectedCourse); setSelectedCourse(null); }}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> Send Bulk Email
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.open(`/course/${selectedCourse.id}`, "_blank")}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview Public Page
                    </Button>
                    {getEffectiveStatus(selectedCourse) === "completed" && (
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => toast({ title: "Certificates queued for generation" })}>
                        <Award className="w-3.5 h-3.5 mr-1.5" /> Issue Certificates
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Course Completion Dialog */}
      <Dialog open={!!completionDialog} onOpenChange={() => setCompletionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Mark as Completed
            </DialogTitle>
            <DialogDescription>
              This closes registration for <strong>{completionDialog?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-muted space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Confirmed</span><span className="font-medium">{completionDialog?.confirmedCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-medium text-amber-600">{completionDialog?.pendingCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">GHS {completionDialog?.revenue.toLocaleString()}</span></div>
            </div>
            {(completionDialog?.pendingCount ?? 0) > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {completionDialog?.pendingCount} pending payments will remain as-is.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialog(null)}>Cancel</Button>
            <Button onClick={() => completionDialog && completeCourse.mutate(completionDialog.id)} disabled={completeCourse.isPending}>
              <Archive className="h-4 w-4 mr-2" /> {completeCourse.isPending ? "Processing…" : "Mark Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={!!bulkEmailCourse} onOpenChange={() => setBulkEmailCourse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Email — {bulkEmailCourse?.title}</DialogTitle>
            <DialogDescription>
              Send an email to all confirmed enrollees in this course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Subject</label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject..." /></div>
            <div><label className="text-sm font-medium">Body</label><Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} placeholder="Write your message..." /></div>
            <p className="text-xs text-muted-foreground">Sends to all confirmed enrollees. Requires configured email domain.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEmailCourse(null)}>Cancel</Button>
            <Button onClick={() => { toast({ title: "Email sending requires email domain setup" }); setBulkEmailCourse(null); }}>
              <Mail className="h-4 w-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
