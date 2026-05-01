/**
 * Admin Renewal Management
 * Expiry watchlist, manual renewal confirmation, renewal stats
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, RefreshCw, CheckCircle, Mail, Clock, AlertTriangle, DollarSign, Users, Download,
} from "lucide-react";

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const LEVEL_LABELS: Record<string, string> = {
  associate: "Part I (Associate)",
  member: "Part II (Member)",
  fellow: "Part III (Fellow)",
};

export default function AdminRenewalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewDialog, setRenewDialog] = useState<any>(null);
  const [renewNotes, setRenewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-members-renewal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members" as any)
        .select("*")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = members.filter((m: any) => {
    const matchesSearch =
      !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.member_id?.includes(search);
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const now = new Date();
  const stats = {
    expiringThisMonth: members.filter((m: any) => {
      if (!m.expiry_date) return false;
      const d = getDaysUntil(m.expiry_date);
      return d > 0 && d <= 30;
    }).length,
    overdue: members.filter((m: any) => m.status === "expired").length,
    renewedThisMonth: members.filter((m: any) => {
      if (!m.issue_date) return false;
      const issue = new Date(m.issue_date);
      return issue.getMonth() === now.getMonth() && issue.getFullYear() === now.getFullYear() && (m.renewal_count || 0) > 0;
    }).length,
    totalActive: members.filter((m: any) => m.status === "active").length,
  };

  const handleManualRenewal = async () => {
    if (!renewDialog) return;
    setIsProcessing(true);

    try {
      const today = new Date();
      const newExpiry = new Date(today);
      newExpiry.setDate(newExpiry.getDate() + 365);
      const todayStr = today.toISOString().split("T")[0];
      const expiryStr = newExpiry.toISOString().split("T")[0];

      // Update member
      const { error: memberErr } = await (supabase as any)
        .from("members")
        .update({
          issue_date: todayStr,
          expiry_date: expiryStr,
          status: "active",
          renewal_count: (renewDialog.renewal_count || 0) + 1,
        })
        .eq("id", renewDialog.id);

      if (memberErr) throw memberErr;

      // Insert renewal history
      const { error: historyErr } = await (supabase as any)
        .from("renewal_history")
        .insert({
          member_id: renewDialog.id,
          renewal_date: todayStr,
          new_expiry_date: expiryStr,
          amount_paid: 0,
          currency: "GHS",
          payment_method: "waived",
          notes: renewNotes || "Manual renewal by admin",
        });

      if (historyErr) throw historyErr;

      toast({ title: `Membership renewed for ${renewDialog.full_name}` });
      setRenewDialog(null);
      setRenewNotes("");
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const getRowColor = (m: any) => {
    if (m.status === "expired") return "bg-red-50";
    if (m.expiry_date && getDaysUntil(m.expiry_date) <= 30) return "bg-amber-50";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Expiring (30 days)", value: stats.expiringThisMonth, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Overdue (Expired)", value: stats.overdue, icon: Clock, color: "text-red-600" },
          { label: "Renewed This Month", value: stats.renewedThisMonth, icon: CheckCircle, color: "text-green-600" },
          { label: "Total Active", value: stats.totalActive, icon: Users, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or member ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Expiry Watchlist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expiry Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Renewals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No members found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m: any) => {
                    const days = m.expiry_date ? getDaysUntil(m.expiry_date) : null;
                    return (
                      <TableRow key={m.id} className={getRowColor(m)}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell>{LEVEL_LABELS[m.part] || m.part}</TableCell>
                        <TableCell className="font-mono">{m.member_id}</TableCell>
                        <TableCell>{m.expiry_date ? formatDate(m.expiry_date) : "—"}</TableCell>
                        <TableCell>
                          {days !== null ? (
                            <span className={days <= 0 ? "text-red-600 font-bold" : days <= 30 ? "text-amber-600 font-semibold" : "text-green-600"}>
                              {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{m.renewal_count || 0}×</TableCell>
                        <TableCell>
                          <Badge className={
                            m.status === "active" ? "bg-green-100 text-green-800" :
                            m.status === "expiring" ? "bg-amber-100 text-amber-800" :
                            m.status === "expired" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(m.status === "expired" || m.status === "expiring") && (
                              <Button size="sm" variant="outline" onClick={() => setRenewDialog(m)}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Renew
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Renewal Dialog */}
      <Dialog open={!!renewDialog} onOpenChange={() => setRenewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Renew Membership</DialogTitle>
            <DialogDescription>
              Confirm a manual renewal for a member.
            </DialogDescription>
          </DialogHeader>
          {renewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Member</p>
                  <p className="font-semibold">{renewDialog.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member ID</p>
                  <p className="font-mono font-bold">{renewDialog.member_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Part</p>
                  <p>{LEVEL_LABELS[renewDialog.part]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Expiry</p>
                  <p>{renewDialog.expiry_date ? formatDate(renewDialog.expiry_date) : "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Admin Notes</p>
                <Textarea
                  placeholder="e.g., Bank transfer confirmed, ref #12345"
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will set the new issue date to today and extend by 365 days. Payment method will be recorded as "waived/manual."
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialog(null)}>Cancel</Button>
            <Button onClick={handleManualRenewal} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
