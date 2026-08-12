/**
 * Admin Enrollments Table — UPDATED for Unified Tables
 * Uses enrollments + orders instead of deprecated course_enrollments
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { fetchJoinedEnrollments, type JoinedEnrollment } from "@/lib/joined-enrollments";
import {
  Search, Download, Eye, CheckCircle, XCircle, StickyNote, Users,
  DollarSign, Clock, Mail, Phone, MapPin, Building2, Briefcase,
  GraduationCap, Globe, MessageSquare, ChevronDown, ChevronUp,
  History, Shield, AlertTriangle, FileText,
} from "lucide-react";

type UnifiedEnrollment = JoinedEnrollment;

// Status mapping for display
const ORDER_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Confirmed", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

// Enrollment status mapping
const ENROLLMENT_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  PENDING_APPROVAL: { label: "Pending", variant: "secondary" },
  DROPPED: { label: "Dropped", variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "default" },
};

export default function AdminEnrollmentsUnified() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedEnrollment, setSelectedEnrollment] = useState<UnifiedEnrollment | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [statementExpanded, setStatementExpanded] = useState(false);

  // Fetch from unified tables
  const { data: enrollments = [], isLoading } = useQuery<UnifiedEnrollment[]>({
    queryKey: ["admin-unified-enrollments"],
    queryFn: () => fetchJoinedEnrollments(),
  });

  // Bulk-fetched so both the table rows and the detail drawer can fall back to
  // live profile/user data when an order's enrollment_metadata snapshot is
  // empty (true for every enrollment made through the current checkout flow).
  const { data: allProfiles = [] } = useQuery<Array<{ user_id: string; full_name: string | null; phone: string | null; country: string | null }>>({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("user_id, full_name, phone, country");
      return data || [];
    },
  });

  // profiles has no email column — that lives on users, so fetch it separately
  const { data: allUsers = [] } = useQuery<Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null }>>({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("users").select("id, email, first_name, last_name");
      return data || [];
    },
  });

  const profileByUserId = useMemo(() => new Map(allProfiles.map((p: any) => [p.user_id, p])), [allProfiles]);
  const userByUserId = useMemo(() => new Map(allUsers.map((u: any) => [u.id, u])), [allUsers]);

  // Prefer the checkout-time metadata snapshot when present (legacy/migrated
  // enrollments), otherwise fall back to the live profiles/users rows.
  const getDisplayInfo = (e: UnifiedEnrollment) => {
    const metadata = e.order?.enrollment_metadata;
    const profile = e.user_id ? profileByUserId.get(e.user_id) : undefined;
    const user = e.user_id ? userByUserId.get(e.user_id) : undefined;
    return {
      full_name: metadata?.full_name || profile?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || undefined,
      email: metadata?.email || user?.email || undefined,
      phone: metadata?.phone || profile?.phone || undefined,
      country: metadata?.country || profile?.country || undefined,
    };
  };

  const { data: enrollmentHistory = [] } = useQuery<UnifiedEnrollment[]>({
    queryKey: ["admin-user-enrollment-history", selectedEnrollment?.user_id],
    queryFn: () => fetchJoinedEnrollments({ userId: selectedEnrollment!.user_id! }),
    enabled: !!selectedEnrollment?.user_id,
  });

  const { data: memberRecord } = useQuery({
    queryKey: ["admin-member-record", selectedEnrollment?.order?.enrollment_metadata?.email],
    queryFn: async () => {
      const email = selectedEnrollment?.order?.enrollment_metadata?.email;
      if (!email) return null;
      const { data } = await (supabase as any).from("members").select("*").eq("email", email).maybeSingle();
      return data;
    },
    enabled: !!selectedEnrollment?.order?.enrollment_metadata?.email,
  });

  // Mutations - update orders table for payment status
  const markPaidMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId);
      if (error) throw error;
      // Also update enrollment status
      await (supabase as any)
        .from("enrollments")
        .update({ status: "ACTIVE" })
        .eq("id", selectedEnrollment?.id);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["admin-unified-enrollments"] }); 
      toast({ title: "Marked as paid" }); 
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (error) throw error;
      await (supabase as any)
        .from("enrollments")
        .update({ status: "DROPPED" })
        .eq("id", selectedEnrollment?.id);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["admin-unified-enrollments"] }); 
      toast({ title: "Registration cancelled" }); 
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      // Store notes in order's enrollment_metadata
      const currentMetadata = selectedEnrollment?.order?.enrollment_metadata || {};
      const { error } = await (supabase as any)
        .from("orders")
        .update({ 
          enrollment_metadata: { ...currentMetadata, admin_notes: note, notes_updated_at: new Date().toISOString() }
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["admin-unified-enrollments"] }); 
      toast({ title: "Note saved" }); 
    },
  });

  // Unique courses for filter
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    enrollments.forEach((e) => {
      if (e.course_id && e.course) map.set(e.course_id, (e.course as any).title);
    });
    return Array.from(map.entries());
  }, [enrollments]);

  const filtered = enrollments.filter((e) => {
    const info = getDisplayInfo(e);
    const matchesSearch = !search ||
      (info.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (info.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (e.order?.booking_ref?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (info.country?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.order?.status === statusFilter;
    const matchesCourse = courseFilter === "all" || e.course_id === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Stats
  const stats = useMemo(() => {
    const confirmed = enrollments.filter((e) => e.order?.status === "completed").length;
    const pending = enrollments.filter((e) => e.order?.status === "pending").length;
    const total = enrollments.length;
    const revenue = enrollments
      .filter((e) => e.order?.status === "completed")
      .reduce((s, e) => s + Number(e.order?.amount || 0), 0);
    return {
      confirmed,
      pending,
      total,
      revenue,
    };
  }, [enrollments]);

  const statusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    const info = ORDER_STATUS_MAP[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  const exportCSV = () => {
    const headers = ["Booking Ref", "Name", "Email", "Course", "Level", "Amount", "Currency", "Status", "Date"];
    const rows = filtered.map((e) => {
      const info = getDisplayInfo(e);
      return [
        e.order?.booking_ref || "N/A",
        info.full_name || "N/A",
        info.email || "N/A",
        (e.course as any)?.title || "",
        e.enrollment_level,
        e.order?.amount || 0,
        e.order?.currency || "GHS",
        e.order?.status || "unknown",
        e.enrolled_at,
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cima-enrollments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const openDrawer = (e: UnifiedEnrollment) => {
    setSelectedEnrollment(e);
    setAdminNote(e.order?.enrollment_metadata?.admin_notes || "");
    setStatementExpanded(false);
  };

  const displayProfile = selectedEnrollment ? getDisplayInfo(selectedEnrollment) : null;
  const otherEnrollments = enrollmentHistory.filter((e) => e.id !== selectedEnrollment?.id);
  const confirmedCount = enrollmentHistory.filter((e) => e.order?.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle, value: stats.confirmed, label: "Confirmed", color: "text-green-600" },
          { icon: Clock, value: stats.pending, label: "Pending", color: "text-amber-600" },
          { icon: Users, value: stats.total, label: "Total", color: "text-primary" },
          { icon: DollarSign, value: `GHS ${stats.revenue.toLocaleString()}`, label: "Revenue", color: "text-green-600" },
        ].map(({ icon: Icon, value, label, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, ref, country..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courseOptions.map(([id, title]) => (
              <SelectItem key={id} value={id}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Ref</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Course</th>
              <th className="text-left p-3 font-medium">Level</th>
              <th className="text-left p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium hidden xl:table-cell">Date</th>
              <th className="text-left p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No enrollments found</td></tr>
            ) : (
              filtered.map((e) => {
                const info = getDisplayInfo(e);
                return (
                  <tr key={e.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openDrawer(e)}>
                    <td className="p-3 font-mono text-[10px]">{e.order?.booking_ref || "N/A"}</td>
                    <td className="p-3 font-medium text-xs">{info.full_name || "N/A"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{info.email}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs max-w-[180px] truncate">{(e.course as any)?.title}</td>
                    <td className="p-3 text-xs capitalize">{e.enrollment_level?.toLowerCase()}</td>
                    <td className="p-3 font-medium text-xs">{e.order?.currency || "GHS"} {Number(e.order?.amount || 0).toLocaleString()}</td>
                    <td className="p-3">{statusBadge(e.order?.status)}</td>
                    <td className="p-3 hidden xl:table-cell text-[10px] text-muted-foreground">
                      {new Date(e.enrolled_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                    <td className="p-3" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDrawer(e)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {e.order?.status === "pending" && e.order?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => markPaidMutation.mutate(e.order!.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selectedEnrollment} onOpenChange={() => setSelectedEnrollment(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEnrollment && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">{selectedEnrollment.order?.booking_ref || "N/A"}</span>
                  Enrollment Details
                </SheetTitle>
              </SheetHeader>

              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{displayProfile?.full_name || "N/A"}</h3>
                      {memberRecord && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{memberRecord.post_nominal || memberRecord.part}</Badge>
                          <span className="text-xs text-muted-foreground">ID: {memberRecord.member_id}</span>
                        </div>
                      )}
                    </div>
                    {statusBadge(selectedEnrollment.order?.status)}
                  </div>
                  <div className="grid gap-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{displayProfile?.email || "N/A"}</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{displayProfile?.phone || "N/A"}</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5" />{displayProfile?.country || "N/A"}</div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {selectedEnrollment.order?.status === "pending" && selectedEnrollment.order?.id && (
                      <Button size="sm" onClick={() => { markPaidMutation.mutate(selectedEnrollment.order!.id); setSelectedEnrollment(null); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                    {selectedEnrollment.order?.status !== "cancelled" && selectedEnrollment.order?.status !== "completed" && selectedEnrollment.order?.id && (
                      <Button size="sm" variant="destructive" onClick={() => { cancelMutation.mutate(selectedEnrollment.order!.id); setSelectedEnrollment(null); }}>
                        <XCircle className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Overview Tab Content */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Course</span>
                        <span className="font-medium text-right max-w-[60%]">{(selectedEnrollment.course as any)?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Level</span>
                        <span className="font-medium capitalize">{selectedEnrollment.enrollment_level?.toLowerCase()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-primary">{selectedEnrollment.order?.currency || "GHS"} {Number(selectedEnrollment.order?.amount || 0).toLocaleString()}</span>
                      </div>
                      {selectedEnrollment.order?.paystack_reference && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paystack Ref</span>
                          <span className="font-mono text-xs">{selectedEnrollment.order.paystack_reference}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                  {otherEnrollments.length > 0 ? (
                    <div className="space-y-2">
                      {otherEnrollments.map((h) => (
                        <Card key={h.id} className={h.id === selectedEnrollment.id ? "border-primary/50 bg-primary/5" : ""}>
                          <CardContent className="p-3 text-sm flex items-center justify-between">
                            <div>
                              <p className="font-medium">{(h.course as any)?.title || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">{h.enrollment_level} • {new Date(h.enrolled_at).toLocaleDateString("en-GB")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(h.order?.status)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No other enrollments</CardContent></Card>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Notes</h4>
                  <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={5} placeholder="Internal notes..." className="text-sm" />
                  {selectedEnrollment.order?.id && (
                    <Button size="sm" onClick={() => saveNoteMutation.mutate({ orderId: selectedEnrollment.order!.id, note: adminNote })}>
                      <StickyNote className="w-3 h-3 mr-1" /> Save Note
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
