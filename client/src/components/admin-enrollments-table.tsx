import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  Eye,
  CheckCircle,
  Mail,
  XCircle,
  StickyNote,
  Users,
  DollarSign,
  Clock,
  FileText,
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
  course?: { title: string } | null;
}

export default function AdminEnrollmentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [adminNote, setAdminNote] = useState("");

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
      e.booking_ref.toLowerCase().includes(search.toLowerCase());
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
          <Input placeholder="Search name, email, or booking ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{e.booking_ref}</td>
                  <td className="p-3 font-medium">{e.full_name}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{e.email}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{(e.course as any)?.title}</td>
                  <td className="p-3">{e.ticket_type}</td>
                  <td className="p-3 font-medium">{e.currency} {Number(e.ticket_price).toLocaleString()}</td>
                  <td className="p-3">{statusBadge(e.payment_status)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedEnrollment(e); setAdminNote(e.admin_notes || ""); }}>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedEnrollment} onOpenChange={() => setSelectedEnrollment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrollment Details — {selectedEnrollment?.booking_ref}</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Name:</span> <strong>{selectedEnrollment.full_name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{selectedEnrollment.email}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> <strong>{selectedEnrollment.phone}</strong></div>
                <div><span className="text-muted-foreground">WhatsApp:</span> <strong>{selectedEnrollment.whatsapp}</strong></div>
                <div><span className="text-muted-foreground">Country:</span> <strong>{selectedEnrollment.country}</strong></div>
                <div><span className="text-muted-foreground">Institution:</span> <strong>{selectedEnrollment.institution}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <strong>{selectedEnrollment.address}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">Programme:</span> <strong>{selectedEnrollment.programme_selected}</strong></div>
                <div><span className="text-muted-foreground">Ticket:</span> <strong>{selectedEnrollment.ticket_type}</strong></div>
                <div><span className="text-muted-foreground">Amount:</span> <strong>{selectedEnrollment.currency} {Number(selectedEnrollment.ticket_price).toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Payment:</span> <strong>{selectedEnrollment.payment_method}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedEnrollment.payment_status)}</div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{new Date(selectedEnrollment.created_at).toLocaleDateString()}</strong></div>
                {selectedEnrollment.paystack_reference && (
                  <div><span className="text-muted-foreground">Paystack Ref:</span> <strong>{selectedEnrollment.paystack_reference}</strong></div>
                )}
              </div>

              {selectedEnrollment.personal_statement && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">Personal Statement:</p>
                  <p className="bg-muted/50 p-3 rounded-lg">{selectedEnrollment.personal_statement}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground mb-1 font-medium">Admin Notes:</p>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} placeholder="Add internal notes..." />
                <Button size="sm" className="mt-2" onClick={() => saveNoteMutation.mutate({ id: selectedEnrollment.id, note: adminNote })}>
                  <StickyNote className="w-3 h-3 mr-1" /> Save Note
                </Button>
              </div>

              <div className="flex gap-2 pt-2 border-t">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
