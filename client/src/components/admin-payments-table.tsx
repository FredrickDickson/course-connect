/**
 * Admin Payments — unified view across orders (course purchases),
 * renewal_history (membership renewals), and expedited_applications
 * (expedited qualification payments), plus a Webhook Events panel sourced
 * from payment_webhook_events so a payment that failed to process is
 * visible instead of just disappearing.
 *
 * This is deliberately separate from the Enrollments tab
 * (admin-enrollments-unified.tsx), which joins orders to enrollments and
 * silently drops any order without a matching enrollment — exactly the kind
 * of gap that made a real payment impossible to find.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Search, Download, Receipt, AlertTriangle, CheckCircle2, Clock, Ban,
} from "lucide-react";

type PaymentKind = "course" | "renewal" | "expedited";

interface UnifiedPaymentRow {
  id: string;
  kind: PaymentKind;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  date: string | null;
  payerName: string | null;
  payerEmail: string | null;
  description: string | null;
}

const KIND_LABEL: Record<PaymentKind, string> = {
  course: "Course",
  renewal: "Renewal",
  expedited: "Expedited App.",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  confirmed: "default",
  active: "default",
  submitted: "default",
  pending: "secondary",
  cancelled: "destructive",
  failed: "destructive",
  draft: "outline",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  return <Badge variant={STATUS_VARIANT[status.toLowerCase()] || "outline"} className="capitalize">{status}</Badge>;
}

async function fetchUnifiedPayments(): Promise<UnifiedPaymentRow[]> {
  const [ordersRes, renewalsRes, expeditedRes, usersRes, coursesRes] = await Promise.all([
    (supabase as any).from("orders")
      .select("id, user_id, course_id, amount, currency, status, paystack_reference, booking_ref, created_at")
      .order("created_at", { ascending: false }),
    (supabase as any).from("renewal_history")
      .select("id, member_id, amount_paid, currency, currency_used, base_amount, payment_reference, payment_method, status, renewal_date, created_at, members:member_id(id, full_name, email, member_id)")
      .order("created_at", { ascending: false }),
    (supabase as any).from("expedited_applications")
      .select("id, user_id, track, target_level, status, paystack_reference, paid_at, submitted_at, created_at")
      .order("created_at", { ascending: false }),
    (supabase as any).from("users").select("id, email, first_name, last_name"),
    (supabase as any).from("courses").select("id, title"),
  ]);

  const usersById = new Map<string, any>((usersRes.data || []).map((u: any) => [u.id, u]));
  const coursesById = new Map<string, any>((coursesRes.data || []).map((c: any) => [c.id, c]));

  const courseRows: UnifiedPaymentRow[] = (ordersRes.data || []).map((o: any) => {
    const user = usersById.get(o.user_id);
    const course = coursesById.get(o.course_id);
    return {
      id: `order-${o.id}`,
      kind: "course" as const,
      reference: o.paystack_reference || o.booking_ref,
      amount: o.amount != null ? Number(o.amount) : null,
      currency: o.currency,
      status: o.status,
      date: o.created_at,
      payerName: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || null : null,
      payerEmail: user?.email || null,
      description: course?.title || "Course purchase",
    };
  });

  const renewalRows: UnifiedPaymentRow[] = (renewalsRes.data || []).map((r: any) => ({
    id: `renewal-${r.id}`,
    kind: "renewal" as const,
    reference: r.payment_reference,
    amount: r.amount_paid != null ? Number(r.amount_paid) : null,
    currency: r.currency,
    status: r.status,
    date: r.created_at || r.renewal_date,
    payerName: r.members?.full_name || null,
    payerEmail: r.members?.email || null,
    description: `Membership renewal${r.members?.member_id ? ` (${r.members.member_id})` : ""}`,
  }));

  const expeditedRows: UnifiedPaymentRow[] = (expeditedRes.data || []).map((e: any) => {
    const user = usersById.get(e.user_id);
    return {
      id: `expedited-${e.id}`,
      kind: "expedited" as const,
      reference: e.paystack_reference,
      amount: null,
      currency: null,
      status: e.status,
      date: e.paid_at || e.created_at,
      payerName: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || null : null,
      payerEmail: user?.email || null,
      description: `Expedited application${e.target_level ? ` — ${e.target_level}` : ""}${e.track ? ` (${e.track})` : ""}`,
    };
  }).filter((e: UnifiedPaymentRow) => !!e.reference); // only ones that actually reached payment

  return [...courseRows, ...renewalRows, ...expeditedRows].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

interface WebhookEventRow {
  id: string;
  provider: string;
  event_type: string;
  reference: string | null;
  signature_valid: boolean | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_STATUS_ICON: Record<string, any> = {
  processed: CheckCircle2,
  already_processed: CheckCircle2,
  reconciled_by_cron: CheckCircle2,
  failed: AlertTriangle,
  skipped: Clock,
  duplicate: Ban,
};

export default function AdminPaymentsTable() {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PaymentKind>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<UnifiedPaymentRow | null>(null);
  const [eventStatusFilter, setEventStatusFilter] = useState<"all" | "failed">("all");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-unified-payments"],
    queryFn: fetchUnifiedPayments,
  });

  const { data: webhookEvents = [], isLoading: eventsLoading } = useQuery<WebhookEventRow[]>({
    queryKey: ["admin-payment-webhook-events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const statusOptions = useMemo(
    () => Array.from(new Set(payments.map((p) => p.status).filter(Boolean))) as string[],
    [payments],
  );

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (dateFrom && (!p.date || p.date < dateFrom)) return false;
      if (dateTo && (!p.date || p.date > `${dateTo}T23:59:59`)) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const haystack = [
          p.reference, p.payerName, p.payerEmail, p.description,
          p.amount != null ? p.amount.toFixed(2) : null,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, kindFilter, statusFilter, dateFrom, dateTo, search]);

  const failedEvents = webhookEvents.filter((e) => e.status === "failed");
  const filteredEvents = eventStatusFilter === "failed" ? failedEvents : webhookEvents;

  const handleExportCSV = () => {
    const headers = ["Type", "Reference", "Amount", "Currency", "Status", "Payer Name", "Payer Email", "Description", "Date"];
    const rows = filtered.map((p) => [
      KIND_LABEL[p.kind], p.reference || "", p.amount ?? "", p.currency || "",
      p.status || "", p.payerName || "", p.payerEmail || "", p.description || "",
      p.date ? new Date(p.date).toISOString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cima_payments.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {payments.length} recorded payments
            {failedEvents.length > 0 && (
              <span className="text-destructive font-medium"> • {failedEvents.length} failed webhook event{failedEvents.length === 1 ? "" : "s"}</span>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Webhook Events
            {failedEvents.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px]">
                {failedEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, email, name, amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="renewal">Renewal</SelectItem>
                <SelectItem value="expedited">Expedited App.</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" aria-label="From date" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" aria-label="To date" />
          </div>

          {isLoading ? (
            <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Reference</th>
                    <th className="text-left p-3 font-medium">Payer</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Description</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(p)}>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{KIND_LABEL[p.kind]}</Badge></td>
                      <td className="p-3 font-mono text-xs">{p.reference || "—"}</td>
                      <td className="p-3">
                        <div className="text-xs">
                          <p className="font-medium">{p.payerName || "—"}</p>
                          <p className="text-muted-foreground">{p.payerEmail || ""}</p>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{p.description || "—"}</td>
                      <td className="p-3 text-xs">{p.amount != null ? `${p.currency || ""} ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="p-3"><StatusBadge status={p.status} /></td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {p.date ? new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Webhook Events Tab */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Every Paystack webhook call, including signature failures and events that couldn't be matched to a
            known payment type. A payment charged by Paystack but missing from the Payments tab above will show up
            here first.
          </p>
          <div className="flex gap-3">
            <Select value={eventStatusFilter} onValueChange={(v) => setEventStatusFilter(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="failed">Failed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {eventsLoading ? (
            <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
          ) : filteredEvents.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No webhook events recorded yet.</CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium">Reference</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Error</th>
                    <th className="text-left p-3 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e) => {
                    const Icon = EVENT_STATUS_ICON[e.status] || Clock;
                    return (
                      <tr key={e.id} className="border-t">
                        <td className="p-3">
                          <Badge variant={e.status === "failed" ? "destructive" : e.status === "skipped" ? "secondary" : "default"} className="text-[10px] flex items-center gap-1 w-fit capitalize">
                            <Icon className="w-3 h-3" /> {e.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">{e.event_type}</td>
                        <td className="p-3 font-mono text-xs">{e.reference || "—"}</td>
                        <td className="p-3 hidden md:table-cell text-xs text-destructive">{e.error_message || ""}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Payment Details</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{KIND_LABEL[selected.kind]}</Badge>
                    <StatusBadge status={selected.status} />
                  </div>
                  {[
                    ["Reference", selected.reference],
                    ["Payer", selected.payerName],
                    ["Email", selected.payerEmail],
                    ["Description", selected.description],
                    ["Amount", selected.amount != null ? `${selected.currency || ""} ${selected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null],
                    ["Date", selected.date ? new Date(selected.date).toLocaleString("en-GB") : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-sm gap-4">
                      <span className="text-muted-foreground flex-shrink-0">{label as string}</span>
                      <span className="font-medium text-right break-all">{value as string}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
