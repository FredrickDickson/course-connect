/**
 * Admin Enrollments Table — Enhanced with course filter, date range,
 * invoice expiry tracking, and comprehensive detail drawer
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
import {
  Search, Download, Eye, CheckCircle, XCircle, StickyNote, Users,
  DollarSign, Clock, Mail, Phone, MapPin, Building2, Briefcase,
  GraduationCap, Globe, MessageSquare, ChevronDown, ChevronUp,
  History, Shield, AlertTriangle, FileText,
} from "lucide-react";

interface Enrollment {
  id: string;
  booking_ref: string;
  course_id: string;
  ticket_type: string;
  ticket_price: number;
  currency: string;
  email: string;
  full_name: string;
  country: string;
  phone: string;
  whatsapp: string;
  institution: string;
  address: string;
  programme_selected: string;
  personal_statement: string;
  payment_method: string;
  payment_status: string;
  paystack_reference: string | null;
  admin_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  invoice_expiry_date: string | null;
  user_id: string | null;
  profile_snapshot: any | null;
  course?: { title: string; cohort_id?: string } | null;
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmed", variant: "default" },
  pending_bank: { label: "Pending — Bank", variant: "secondary" },
  pending_invoice: { label: "Pending — Invoice", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function AdminEnrollmentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [statementExpanded, setStatementExpanded] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ["admin-course-enrollments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("*, course:courses(title, cohort_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["admin-user-profile", selectedEnrollment?.user_id],
    queryFn: async () => {
      if (!selectedEnrollment?.user_id) return null;
      const { data } = await (supabase as any).from("profiles").select("*").eq("user_id", selectedEnrollment.user_id).maybeSingle();
      return data;
    },
    enabled: !!selectedEnrollment?.user_id,
  });

  const { data: enrollmentHistory = [] } = useQuery<Enrollment[]>({
    queryKey: ["admin-user-enrollment-history", selectedEnrollment?.email],
    queryFn: async () => {
      if (!selectedEnrollment?.email) return [];
      const { data } = await (supabase as any)
        .from("course_enrollments")
        .select("*, course:courses(title)")
        .eq("email", selectedEnrollment.email)
        .order("created_at", { ascending: false });
      return (data || []) as Enrollment[];
    },
    enabled: !!selectedEnrollment?.email,
  });

  const { data: memberRecord } = useQuery({
    queryKey: ["admin-member-record", selectedEnrollment?.email],
    queryFn: async () => {
      if (!selectedEnrollment?.email) return null;
      const { data } = await (supabase as any).from("members").select("*").eq("email", selectedEnrollment.email).maybeSingle();
      return data;
    },
    enabled: !!selectedEnrollment?.email,
  });

  // Mutations
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("course_enrollments")
        .update({ payment_status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] }); toast({ title: "Marked as paid" }); },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("course_enrollments").update({ payment_status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] }); toast({ title: "Registration cancelled" }); },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await (supabase as any).from("course_enrollments").update({ admin_notes: note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] }); toast({ title: "Note saved" }); },
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
    const matchesSearch = !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
      e.country?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.payment_status === statusFilter;
    const matchesCourse = courseFilter === "all" || e.course_id === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Stats
  const stats = {
    confirmed: enrollments.filter((e) => e.payment_status === "confirmed").length,
    pending: enrollments.filter((e) => e.payment_status === "pending_bank" || e.payment_status === "pending_invoice").length,
    total: enrollments.length,
    revenue: enrollments.filter((e) => e.payment_status === "confirmed").reduce((s, e) => s + Number(e.ticket_price || 0), 0),
    expiredInvoices: enrollments.filter((e) => e.payment_status === "pending_invoice" && e.invoice_expiry_date && new Date(e.invoice_expiry_date) < new Date()).length,
  };

  const statusBadge = (status: string) => {
    const info = PAYMENT_STATUS_MAP[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  const exportCSV = () => {
    const headers = ["Booking Ref", "Name", "Email", "Phone", "Country", "Institution", "Course", "Ticket", "Amount", "Currency", "Method", "Status", "Date"];
    const rows = filtered.map((e) => [
      e.booking_ref, e.full_name, e.email, e.phone, e.country, e.institution,
      (e.course as any)?.title || "", e.ticket_type, e.ticket_price, e.currency,
      e.payment_method, e.payment_status, e.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cima-enrollments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const openDrawer = (e: Enrollment) => {
    setSelectedEnrollment(e);
    setAdminNote(e.admin_notes || "");
    setStatementExpanded(false);
    setShowSnapshot(false);
  };

  const displayProfile = showSnapshot && selectedEnrollment?.profile_snapshot ? selectedEnrollment.profile_snapshot : userProfile;
  const otherEnrollments = enrollmentHistory.filter((e) => e.id !== selectedEnrollment?.id);
  const confirmedCount = enrollmentHistory.filter((e) => e.payment_status === "confirmed").length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: CheckCircle, value: stats.confirmed, label: "Confirmed", color: "text-green-600" },
          { icon: Clock, value: stats.pending, label: "Pending", color: "text-amber-600" },
          { icon: Users, value: stats.total, label: "Total", color: "text-primary" },
          { icon: DollarSign, value: `GHS ${stats.revenue.toLocaleString()}`, label: "Revenue", color: "text-green-600" },
          { icon: AlertTriangle, value: stats.expiredInvoices, label: "Expired Invoices", color: "text-red-600" },
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

      {/* Expired invoices alert */}
      {stats.expiredInvoices > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {stats.expiredInvoices} invoice(s) have expired and need attention
          </p>
          <Button size="sm" variant="outline" className="text-red-800 border-red-300" onClick={() => setStatusFilter("pending_invoice")}>
            View Expired
          </Button>
        </div>
      )}

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
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending_bank">Pending Bank</SelectItem>
            <SelectItem value="pending_invoice">Pending Invoice</SelectItem>
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
              <th className="text-left p-3 font-medium">Ticket</th>
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
                const invoiceExpired = e.payment_status === "pending_invoice" && e.invoice_expiry_date && new Date(e.invoice_expiry_date) < new Date();
                return (
                  <tr key={e.id} className={`border-t hover:bg-muted/30 cursor-pointer ${invoiceExpired ? "bg-red-50/50" : ""}`} onClick={() => openDrawer(e)}>
                    <td className="p-3 font-mono text-[10px]">{e.booking_ref}</td>
                    <td className="p-3 font-medium text-xs">{e.full_name}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{e.email}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs max-w-[180px] truncate">{(e.course as any)?.title}</td>
                    <td className="p-3 text-xs capitalize">{e.ticket_type}</td>
                    <td className="p-3 font-medium text-xs">{e.currency} {Number(e.ticket_price).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {statusBadge(e.payment_status)}
                        {invoiceExpired && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
                    </td>
                    <td className="p-3 hidden xl:table-cell text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                    <td className="p-3" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDrawer(e)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {(e.payment_status === "pending_bank" || e.payment_status === "pending_invoice") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => markPaidMutation.mutate(e.id)}>
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

      {/* ===== DETAIL DRAWER ===== */}
      <Sheet open={!!selectedEnrollment} onOpenChange={() => setSelectedEnrollment(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEnrollment && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">{selectedEnrollment.booking_ref}</span>
                  Enrollment Details
                </SheetTitle>
              </SheetHeader>

              {/* Identity Card */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{selectedEnrollment.full_name}</h3>
                      {memberRecord && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{memberRecord.post_nominal || memberRecord.part}</Badge>
                          <span className="text-xs text-muted-foreground">ID: {memberRecord.member_id}</span>
                        </div>
                      )}
                    </div>
                    {statusBadge(selectedEnrollment.payment_status)}
                  </div>
                  <div className="grid gap-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{selectedEnrollment.email}</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{selectedEnrollment.phone}</div>
                    {selectedEnrollment.whatsapp && selectedEnrollment.whatsapp !== selectedEnrollment.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="w-3.5 h-3.5" />WhatsApp: {selectedEnrollment.whatsapp}</div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5" />{selectedEnrollment.country}</div>
                    {selectedEnrollment.institution && (
                      <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{selectedEnrollment.institution}</div>
                    )}
                  </div>

                  {/* Invoice expiry warning */}
                  {selectedEnrollment.payment_status === "pending_invoice" && selectedEnrollment.invoice_expiry_date && (
                    <div className={`mt-3 p-2 rounded text-xs flex items-center gap-1.5 ${new Date(selectedEnrollment.invoice_expiry_date) < new Date() ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      <FileText className="w-3.5 h-3.5" />
                      Invoice {new Date(selectedEnrollment.invoice_expiry_date) < new Date() ? "expired" : "expires"}: {new Date(selectedEnrollment.invoice_expiry_date).toLocaleDateString("en-GB")}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {(selectedEnrollment.payment_status === "pending_bank" || selectedEnrollment.payment_status === "pending_invoice") && (
                      <Button size="sm" onClick={() => { markPaidMutation.mutate(selectedEnrollment.id); setSelectedEnrollment(null); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                    {selectedEnrollment.payment_status !== "cancelled" && selectedEnrollment.payment_status !== "confirmed" && (
                      <Button size="sm" variant="destructive" onClick={() => { cancelMutation.mutate(selectedEnrollment.id); setSelectedEnrollment(null); }}>
                        <XCircle className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-3 space-y-2 text-sm">
                      {[
                        ["Course", (selectedEnrollment.course as any)?.title],
                        ["Cohort", (selectedEnrollment.course as any)?.cohort_id],
                        ["Programme", selectedEnrollment.programme_selected],
                        ["Ticket", selectedEnrollment.ticket_type],
                      ].filter(([, v]) => v).map(([l, v]) => (
                        <div key={l as string} className="flex justify-between">
                          <span className="text-muted-foreground">{l as string}</span>
                          <span className="font-medium text-right max-w-[60%] capitalize">{v as string}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-primary">{selectedEnrollment.currency} {Number(selectedEnrollment.ticket_price).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium capitalize">{selectedEnrollment.payment_method.replace("_", " ")}</span>
                      </div>
                      {selectedEnrollment.paystack_reference && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paystack Ref</span>
                          <span className="font-mono text-xs">{selectedEnrollment.paystack_reference}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Enrolled</span>
                        <span className="font-medium">{new Date(selectedEnrollment.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedEnrollment.personal_statement && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Statement</h4>
                      <Card>
                        <CardContent className="p-3">
                          <p className={`text-sm text-muted-foreground ${!statementExpanded ? "line-clamp-3" : ""}`}>
                            {selectedEnrollment.personal_statement}
                          </p>
                          {selectedEnrollment.personal_statement.length > 150 && (
                            <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => setStatementExpanded(!statementExpanded)}>
                              {statementExpanded ? <><ChevronUp className="w-3 h-3 mr-1" /> Collapse</> : <><ChevronDown className="w-3 h-3 mr-1" /> Expand</>}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {selectedEnrollment.address && (
                    <Card><CardContent className="p-3 text-sm flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />{selectedEnrollment.address}
                    </CardContent></Card>
                  )}
                </TabsContent>

                {/* Profile */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  {selectedEnrollment.profile_snapshot && userProfile && (
                    <div className="flex items-center gap-2">
                      <Button variant={showSnapshot ? "outline" : "default"} size="sm" className="text-xs h-7" onClick={() => setShowSnapshot(false)}>Current</Button>
                      <Button variant={showSnapshot ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setShowSnapshot(true)}>
                        <History className="w-3 h-3 mr-1" /> At Enrollment
                      </Button>
                    </div>
                  )}

                  {displayProfile ? (
                    <Card>
                      <CardContent className="p-4 space-y-3 text-sm">
                        {showSnapshot && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2">
                            <Shield className="w-3 h-3" /> Snapshot from {new Date(selectedEnrollment.profile_snapshot?.snapshot_at || selectedEnrollment.created_at).toLocaleDateString()}
                          </div>
                        )}
                        <div className="grid gap-3">
                          {[
                            [Building2, "Institution", displayProfile.institution],
                            [Briefcase, "Job Title", displayProfile.job_title],
                            [Clock, "Experience", displayProfile.years_experience],
                            [Globe, "Industry", displayProfile.industry],
                            [Users, "Role", displayProfile.role_category],
                            [GraduationCap, "Education", displayProfile.education_level],
                            [Shield, "ADR Experience", displayProfile.adr_experience !== "none" ? displayProfile.adr_experience : null],
                          ].filter(([, , v]) => v).map(([Icon, label, value]) => (
                            <div key={label as string} className="flex items-start gap-3">
                              {/* @ts-ignore */}
                              <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">{label as string}</p>
                                <p className="font-medium capitalize">{value as string}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No profile available.
                      {selectedEnrollment.institution && <p className="mt-1">Institution: <strong>{selectedEnrollment.institution}</strong></p>}
                    </CardContent></Card>
                  )}
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Enrollment History</h4>
                    {confirmedCount > 1 && <Badge variant="outline" className="text-xs">Repeat ({confirmedCount}×)</Badge>}
                  </div>
                  {enrollmentHistory.length > 0 ? (
                    <div className="space-y-2">
                      {enrollmentHistory.map((h) => (
                        <Card key={h.id} className={h.id === selectedEnrollment.id ? "border-primary/50 bg-primary/5" : ""}>
                          <CardContent className="p-3 text-sm flex items-center justify-between">
                            <div>
                              <p className="font-medium">{(h.course as any)?.title || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">{h.ticket_type} • {new Date(h.created_at).toLocaleDateString("en-GB")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(h.payment_status)}
                              {h.id === selectedEnrollment.id && <span className="text-[10px] text-primary font-medium">Current</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">First-time enrollee</CardContent></Card>
                  )}

                  {memberRecord && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Membership</h4>
                      <Card>
                        <CardContent className="p-3 text-sm space-y-1">
                          {[
                            ["Member ID", memberRecord.member_id],
                            ["Part", memberRecord.part],
                            ["Status", memberRecord.status],
                            ["Expires", memberRecord.expiry_date ? new Date(memberRecord.expiry_date).toLocaleDateString() : null],
                          ].filter(([, v]) => v).map(([l, v]) => (
                            <div key={l as string} className="flex justify-between">
                              <span className="text-muted-foreground">{l as string}</span>
                              <span className="font-medium capitalize">{v as string}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* Notes */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Notes</h4>
                  <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={5} placeholder="Internal notes..." className="text-sm" />
                  <Button size="sm" onClick={() => saveNoteMutation.mutate({ id: selectedEnrollment.id, note: adminNote })}>
                    <StickyNote className="w-3 h-3 mr-1" /> Save Note
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
