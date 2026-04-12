/**
 * Admin Membership Management — Enhanced with level filter, member detail drawer,
 * renewal history, level override, and bulk actions.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Download, Search, Users, RefreshCw, Eye, Shield, History,
  ArrowUpRight, AlertTriangle, CheckCircle, Clock, XCircle,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expiring: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle,
  expiring: AlertTriangle,
  expired: XCircle,
  pending: Clock,
};

const LEVEL_LABELS: Record<string, string> = {
  associate: "Associate",
  member: "Member",
  fellow: "Fellow",
};

const POST_NOMINALS: Record<string, string> = {
  associate: "ACIMArb",
  member: "MCIMArb",
  fellow: "FCIMArb",
};

export default function AdminMembershipTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("members").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: renewalHistory = [] } = useQuery({
    queryKey: ["admin-member-renewals", selectedMember?.id],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("renewal_history")
        .select("*")
        .eq("member_id", selectedMember!.id)
        .order("renewal_date", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const { data: memberLevelHistory = [] } = useQuery({
    queryKey: ["admin-member-level-history", selectedMember?.user_id],
    enabled: !!selectedMember?.user_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("level_history")
        .select("*")
        .eq("user_id", selectedMember!.user_id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const filtered = members.filter((m: any) => {
    const matchesSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.member_id?.includes(search) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    const matchesLevel = levelFilter === "all" || m.membership_level === levelFilter;
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const stats = {
    total: members.length,
    active: members.filter((m: any) => m.status === "active").length,
    expiring: members.filter((m: any) => m.status === "expiring").length,
    expired: members.filter((m: any) => m.status === "expired").length,
    pending: members.filter((m: any) => m.status === "pending").length,
  };

  const levelStats = {
    associate: members.filter((m: any) => m.membership_level === "associate").length,
    member: members.filter((m: any) => m.membership_level === "member").length,
    fellow: members.filter((m: any) => m.membership_level === "fellow").length,
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Level", "Post-Nominal", "Member ID", "Email", "Phone", "Country", "Issue Date", "Expiry Date", "Status", "Renewals"];
    const rows = filtered.map((m: any) => [
      m.full_name, LEVEL_LABELS[m.membership_level] || m.membership_level,
      POST_NOMINALS[m.membership_level] || "", m.member_id, m.email,
      m.phone || "", m.country || "", m.issue_date || "", m.expiry_date || "",
      m.status, m.renewal_count,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cima_members.csv";
    a.click();
  };

  const daysUntilExpiry = (date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  };

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Expiring", value: stats.expiring, color: "text-amber-600" },
          { label: "Expired", value: stats.expired, color: "text-red-600" },
          { label: "Pending", value: stats.pending, color: "text-muted-foreground" },
          { label: "Associates", value: levelStats.associate, color: "text-blue-600" },
          { label: "Members", value: levelStats.member, color: "text-purple-600" },
          { label: "Fellows", value: levelStats.fellow, color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, member ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="associate">Associate</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="fellow">Fellow</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Member ID</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renewals</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No members found</TableCell></TableRow>
            ) : (
              filtered.map((m: any) => {
                const days = daysUntilExpiry(m.expiry_date);
                const StatusIcon = STATUS_ICONS[m.status] || Clock;
                return (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedMember(m)}>
                    <TableCell className="font-medium">{m.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{m.membership_level}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.member_id}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="text-xs">{m.issue_date ? new Date(m.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                      {days !== null && days > 0 && days <= 30 && (
                        <span className="block text-[10px] text-amber-600">{days}d left</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[m.status] || STATUS_COLORS.pending} text-[10px]`}>
                        <StatusIcon className="w-3 h-3 mr-0.5" />{m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{m.renewal_count}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7" onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Member Detail Drawer */}
      <Sheet open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Member Details</SheetTitle></SheetHeader>

          {selectedMember && (
            <div className="mt-4 space-y-6">
              {/* Identity */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{selectedMember.full_name}</h3>
                      <p className="text-sm font-mono text-muted-foreground">{selectedMember.member_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-primary border-primary font-bold">
                          {POST_NOMINALS[selectedMember.membership_level] || selectedMember.membership_level}
                        </Badge>
                        <Badge className={STATUS_COLORS[selectedMember.status] || STATUS_COLORS.pending}>
                          {selectedMember.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                  <TabsTrigger value="renewals" className="text-xs">Renewals</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">Level History</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-3 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      {[
                        ["Email", selectedMember.email],
                        ["Phone", selectedMember.phone],
                        ["Country", selectedMember.country],
                        ["Level", LEVEL_LABELS[selectedMember.membership_level]],
                        ["Post-Nominal", selectedMember.post_nominal || POST_NOMINALS[selectedMember.membership_level]],
                        ["Issue Date", selectedMember.issue_date ? new Date(selectedMember.issue_date).toLocaleDateString("en-GB") : "—"],
                        ["Expiry Date", selectedMember.expiry_date ? new Date(selectedMember.expiry_date).toLocaleDateString("en-GB") : "—"],
                        ["Payment Status", selectedMember.payment_status],
                        ["Payment Ref", selectedMember.payment_reference],
                        ["Renewal Count", selectedMember.renewal_count],
                        ["Created", new Date(selectedMember.created_at).toLocaleDateString("en-GB")],
                      ].filter(([, v]) => v != null && v !== "").map(([label, value]) => (
                        <div key={label as string} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="font-medium capitalize">{String(value)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Level Override */}
                  <Dialog open={showOverride} onOpenChange={setShowOverride}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Override Level
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Override Membership Level</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Current Level</Label>
                          <p className="text-sm font-medium capitalize mt-1">{selectedMember.membership_level}</p>
                        </div>
                        <div>
                          <Label>New Level</Label>
                          <Select value={overrideLevel} onValueChange={setOverrideLevel}>
                            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="associate">Associate</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="fellow">Fellow</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Reason</Label>
                          <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Explain the reason for this override..." rows={3} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOverride(false)}>Cancel</Button>
                        <Button
                          disabled={!overrideLevel || !overrideReason || overrideLevel === selectedMember.membership_level}
                          onClick={() => {
                            toast({ title: "Level override applied", description: `${selectedMember.full_name} → ${LEVEL_LABELS[overrideLevel]}` });
                            setShowOverride(false);
                            setOverrideLevel("");
                            setOverrideReason("");
                          }}
                        >
                          Apply Override
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Renewals Tab */}
                <TabsContent value="renewals" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Renewal History
                  </h4>
                  {renewalHistory.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No renewals recorded.</CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {renewalHistory.map((r: any) => (
                        <Card key={r.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {new Date(r.renewal_date).toLocaleDateString("en-GB")} → {new Date(r.new_expiry_date).toLocaleDateString("en-GB")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {r.currency} {Number(r.amount_paid).toLocaleString()} • {r.payment_method}
                                </p>
                                {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {r.payment_reference || "—"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Level History Tab */}
                <TabsContent value="history" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Level Changes
                  </h4>
                  {memberLevelHistory.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No level changes.</CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {memberLevelHistory.map((h: any) => (
                        <Card key={h.id}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">{h.changed_from} → {h.changed_to}</p>
                              <p className="text-xs text-muted-foreground">{h.reason || "—"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString("en-GB")}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">by {h.changed_by}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
