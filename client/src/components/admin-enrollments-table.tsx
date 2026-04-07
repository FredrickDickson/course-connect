import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  StickyNote,
  Users,
  DollarSign,
  Clock,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  GraduationCap,
  Globe,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  History,
  Shield,
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
  user_id: string | null;
  profile_snapshot: any | null;
  course?: { title: string } | null;
}

export default function AdminEnrollmentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [statementExpanded, setStatementExpanded] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ["admin-course-enrollments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("*, course:courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
  });

  // Fetch profile for selected enrollment
  const { data: userProfile } = useQuery({
    queryKey: ["admin-user-profile", selectedEnrollment?.user_id],
    queryFn: async () => {
      if (!selectedEnrollment?.user_id) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", selectedEnrollment.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedEnrollment?.user_id,
  });

  // Fetch enrollment history for this user
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

  // Fetch member record
  const { data: memberRecord } = useQuery({
    queryKey: ["admin-member-record", selectedEnrollment?.email],
    queryFn: async () => {
      if (!selectedEnrollment?.email) return null;
      const { data } = await (supabase as any)
        .from("members")
        .select("*")
        .eq("email", selectedEnrollment.email)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedEnrollment?.email,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("course_enrollments")
        .update({ payment_status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      toast({ title: "Marked as paid" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("course_enrollments")
        .update({ payment_status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      toast({ title: "Registration cancelled" });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await (supabase as any)
        .from("course_enrollments")
        .update({ admin_notes: note })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      toast({ title: "Note saved" });
    },
  });

  const filtered = enrollments.filter((e) => {
    const matchesSearch =
      !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
      e.country?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    confirmed: enrollments.filter((e) => e.payment_status === "confirmed").length,
    pendingBank: enrollments.filter((e) => e.payment_status === "pending_bank").length,
    pendingInvoice: enrollments.filter((e) => e.payment_status === "pending_invoice").length,
    totalRevenue: enrollments
      .filter((e) => e.payment_status === "confirmed")
      .reduce((sum, e) => sum + Number(e.ticket_price || 0), 0),
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      confirmed: { label: "Confirmed", variant: "default" },
      pending_bank: { label: "Pending — Bank", variant: "secondary" },
      pending_invoice: { label: "Pending — Invoice", variant: "secondary" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const exportCSV = () => {
    const headers = ["Booking Ref", "Full Name", "Email", "Phone", "WhatsApp", "Country", "Institution", "Address", "Programme", "Course", "Ticket Type", "Amount", "Currency", "Payment Method", "Payment Status", "Personal Statement", "Date"];
    const rows = filtered.map((e) => [
      e.booking_ref, e.full_name, e.email, e.phone, e.whatsapp, e.country, e.institution, e.address, e.programme_selected,
      (e.course as any)?.title || "", e.ticket_type, e.ticket_price, e.currency, e.payment_method, e.payment_status, `"${(e.personal_statement || "").replace(/"/g, '""')}"`, e.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cima-enrollments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const openDrawer = (e: Enrollment) => {
    setSelectedEnrollment(e);
    setAdminNote(e.admin_notes || "");
    setStatementExpanded(false);
    setShowSnapshot(false);
  };

  // Get the profile data to display — either snapshot or current
  const displayProfile = showSnapshot && selectedEnrollment?.profile_snapshot
    ? selectedEnrollment.profile_snapshot
    : userProfile;

  const otherEnrollments = enrollmentHistory.filter((e) => e.id !== selectedEnrollment?.id);
  const confirmedCount = enrollmentHistory.filter((e) => e.payment_status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.confirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{stats.pendingBank + stats.pendingInvoice}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">GHS {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, ref, or country..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending_bank">Pending Bank</SelectItem>
            <SelectItem value="pending_invoice">Pending Invoice</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
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
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No enrollments found</td></tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openDrawer(e)}>
                  <td className="p-3 font-mono text-xs">{e.booking_ref}</td>
                  <td className="p-3 font-medium">{e.full_name}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{e.email}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{(e.course as any)?.title}</td>
                  <td className="p-3">{e.ticket_type}</td>
                  <td className="p-3 font-medium">{e.currency} {Number(e.ticket_price).toLocaleString()}</td>
                  <td className="p-3">{statusBadge(e.payment_status)}</td>
                  <td className="p-3">
                    <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDrawer(e)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(e.payment_status === "pending_bank" || e.payment_status === "pending_invoice") && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => markPaidMutation.mutate(e.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {e.payment_status !== "cancelled" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => cancelMutation.mutate(e.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== DETAIL DRAWER (Sheet) ===== */}
      <Sheet open={!!selectedEnrollment} onOpenChange={() => setSelectedEnrollment(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEnrollment && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">
                  <span className="text-xs font-mono text-muted-foreground block mb-1">{selectedEnrollment.booking_ref}</span>
                  Enrollment Details
                </SheetTitle>
              </SheetHeader>

              {/* ===== SECTION 1: Identity Card (Sticky feel) ===== */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selectedEnrollment.full_name}</h3>
                      {memberRecord && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{memberRecord.post_nominal || memberRecord.membership_level}</Badge>
                          <span className="text-xs text-muted-foreground">ID: {memberRecord.member_id}</span>
                        </div>
                      )}
                    </div>
                    {statusBadge(selectedEnrollment.payment_status)}
                  </div>
                  <div className="grid gap-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{selectedEnrollment.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{selectedEnrollment.phone}</span>
                    </div>
                    {selectedEnrollment.whatsapp && selectedEnrollment.whatsapp !== selectedEnrollment.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>WhatsApp: {selectedEnrollment.whatsapp}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{selectedEnrollment.country}</span>
                    </div>
                    {selectedEnrollment.institution && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{selectedEnrollment.institution}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {(selectedEnrollment.payment_status === "pending_bank" || selectedEnrollment.payment_status === "pending_invoice") && (
                      <Button size="sm" onClick={() => { markPaidMutation.mutate(selectedEnrollment.id); setSelectedEnrollment(null); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark as Paid
                      </Button>
                    )}
                    {selectedEnrollment.payment_status !== "cancelled" && (
                      <Button size="sm" variant="destructive" onClick={() => { cancelMutation.mutate(selectedEnrollment.id); setSelectedEnrollment(null); }}>
                        <XCircle className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabbed sections */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                </TabsList>

                {/* === OVERVIEW TAB === */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Course Context */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Course Enrollment</h4>
                    <Card>
                      <CardContent className="p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Course</span>
                          <span className="font-medium text-right max-w-[60%]">{(selectedEnrollment.course as any)?.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Programme</span>
                          <span className="font-medium text-right max-w-[60%]">{selectedEnrollment.programme_selected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ticket Type</span>
                          <span className="font-medium">{selectedEnrollment.ticket_type}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-bold text-primary">{selectedEnrollment.currency} {Number(selectedEnrollment.ticket_price).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Method</span>
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
                  </div>

                  {/* Personal Statement */}
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
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Address</h4>
                      <Card>
                        <CardContent className="p-3 text-sm flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <span>{selectedEnrollment.address}</span>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* === PROFILE TAB === */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  {/* Snapshot toggle */}
                  {selectedEnrollment.profile_snapshot && userProfile && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={showSnapshot ? "outline" : "default"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowSnapshot(false)}
                      >
                        Current Profile
                      </Button>
                      <Button
                        variant={showSnapshot ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowSnapshot(true)}
                      >
                        <History className="w-3 h-3 mr-1" /> At Enrollment
                      </Button>
                    </div>
                  )}

                  {displayProfile ? (
                    <Card>
                      <CardContent className="p-4 space-y-3 text-sm">
                        {showSnapshot && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2">
                            <Shield className="w-3 h-3" />
                            Snapshot from {new Date(selectedEnrollment.profile_snapshot?.snapshot_at || selectedEnrollment.created_at).toLocaleDateString()}
                          </div>
                        )}

                        <div className="grid gap-3">
                          {displayProfile.institution && (
                            <div className="flex items-start gap-3">
                              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Institution</p>
                                <p className="font-medium">{displayProfile.institution}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.job_title && (
                            <div className="flex items-start gap-3">
                              <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Job Title</p>
                                <p className="font-medium">{displayProfile.job_title}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.years_experience && (
                            <div className="flex items-start gap-3">
                              <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Experience</p>
                                <p className="font-medium">{displayProfile.years_experience}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.industry && (
                            <div className="flex items-start gap-3">
                              <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Industry</p>
                                <p className="font-medium">{displayProfile.industry}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.role_category && (
                            <div className="flex items-start gap-3">
                              <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Role Category</p>
                                <p className="font-medium">{displayProfile.role_category}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.education_level && (
                            <div className="flex items-start gap-3">
                              <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Education</p>
                                <p className="font-medium">{displayProfile.education_level}</p>
                              </div>
                            </div>
                          )}
                          {displayProfile.adr_experience && displayProfile.adr_experience !== "none" && (
                            <div className="flex items-start gap-3">
                              <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">ADR Experience</p>
                                <p className="font-medium capitalize">{displayProfile.adr_experience}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        No professional profile available yet.
                        {selectedEnrollment.institution && (
                          <p className="mt-1">Institution from enrollment: <strong>{selectedEnrollment.institution}</strong></p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* === HISTORY TAB === */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Enrollment History</h4>
                    {confirmedCount > 1 && (
                      <Badge variant="outline" className="text-xs">Repeat Attendee ({confirmedCount}x)</Badge>
                    )}
                  </div>

                  {otherEnrollments.length > 0 ? (
                    <div className="space-y-2">
                      {enrollmentHistory.map((h) => (
                        <Card key={h.id} className={h.id === selectedEnrollment.id ? "border-primary/50 bg-primary/5" : ""}>
                          <CardContent className="p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{(h.course as any)?.title || "Unknown Course"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {h.ticket_type} • {new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {statusBadge(h.payment_status)}
                                {h.id === selectedEnrollment.id && <span className="text-xs text-primary font-medium">Current</span>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        First-time enrollee
                      </CardContent>
                    </Card>
                  )}

                  {/* Membership record */}
                  {memberRecord && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Membership</h4>
                      <Card>
                        <CardContent className="p-3 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Member ID</span>
                            <span className="font-mono font-medium">{memberRecord.member_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Level</span>
                            <span className="font-medium capitalize">{memberRecord.membership_level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={memberRecord.status === "active" ? "default" : "secondary"} className="capitalize">{memberRecord.status}</Badge>
                          </div>
                          {memberRecord.expiry_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Expires</span>
                              <span className="font-medium">{new Date(memberRecord.expiry_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* === NOTES TAB === */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Notes</h4>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={5}
                    placeholder="Add internal notes about this enrollment..."
                    className="text-sm"
                  />
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
