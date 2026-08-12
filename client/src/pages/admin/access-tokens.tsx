/**
 * Admin Access Tokens Management
 * Lets admins generate/manage single-use (or limited-use) course access
 * and coupon codes for students who paid outside the app.
 */

import { useState } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KeyRound,
  Plus,
  Copy,
  Ban,
  Trash2,
  MoreVertical,
  Loader2,
} from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
}

interface AccessToken {
  id: string;
  course_id: string;
  token: string;
  discount_value: number;
  usage_limit: number;
  usage_count: number;
  expires_at: string | null;
  status: "active" | "disabled";
  derived_status: "active" | "disabled" | "expired" | "redeemed";
  created_at: string;
  course?: { id: string; title: string } | null;
  redemptions: Array<{
    id: string;
    user_id: string;
    created_at: string;
    user: { email: string; first_name: string | null; last_name: string | null } | null;
  }>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<AccessToken["derived_status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  redeemed: { label: "Redeemed", variant: "secondary" },
  expired: { label: "Expired", variant: "outline" },
  disabled: { label: "Disabled", variant: "destructive" },
};

export default function AdminAccessTokens() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const preselectedCourseId = new URLSearchParams(search).get("courseId") || "";

  const [courseFilter, setCourseFilter] = useState<string>(preselectedCourseId);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<AccessToken | null>(null);
  const [detailToken, setDetailToken] = useState<AccessToken | null>(null);

  const [formCourseId, setFormCourseId] = useState(preselectedCourseId);
  const [formDiscountValue, setFormDiscountValue] = useState("100");
  const [formUsageLimit, setFormUsageLimit] = useState("1");
  const [formExpiresAt, setFormExpiresAt] = useState("");

  const { data: courses } = useQuery<CourseOption[]>({
    queryKey: ["admin-access-tokens-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tokens, isLoading } = useQuery<AccessToken[]>({
    queryKey: ["admin-access-tokens", courseFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseFilter) params.set("courseId", courseFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/admin/access-tokens?${params.toString()}`);
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/access-tokens", {
        courseId: formCourseId,
        discountValue: parseFloat(formDiscountValue),
        usageLimit: parseInt(formUsageLimit, 10) || 1,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate token");
      }
      return res.json() as Promise<AccessToken>;
    },
    onSuccess: (created) => {
      toast({ title: "Token generated", description: created.token });
      queryClient.invalidateQueries({ queryKey: ["admin-access-tokens"] });
      setGenerateOpen(false);
      setFormDiscountValue("100");
      setFormUsageLimit("1");
      setFormExpiresAt("");
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/access-tokens/${id}/disable`);
      if (!res.ok) throw new Error("Failed to disable token");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Token disabled" });
      queryClient.invalidateQueries({ queryKey: ["admin-access-tokens"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/access-tokens/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete token");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Token deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-access-tokens"] });
      setTokenToDelete(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: "Copied", description: token });
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="w-6 h-6" /> Access Tokens
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate course access codes for students who paid outside the app.
            </p>
          </div>
          <Button onClick={() => { setFormCourseId(courseFilter); setGenerateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Generate Token
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={courseFilter || "all"} onValueChange={(v) => setCourseFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {(courses || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tokens…
              </div>
            ) : !tokens?.length ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No access tokens found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Redeemed By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((t) => {
                    const badge = STATUS_BADGE[t.derived_status];
                    const lastRedemption = t.redemptions?.[t.redemptions.length - 1];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.token}</TableCell>
                        <TableCell>{t.course?.title || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {t.discount_value !== 100 && (
                            <Badge variant="outline" className="ml-1.5">{t.discount_value}% off</Badge>
                          )}
                        </TableCell>
                        <TableCell>{t.usage_count} / {t.usage_limit}</TableCell>
                        <TableCell className="text-sm">
                          {t.redemptions?.length
                            ? t.redemptions.length === 1
                              ? lastRedemption?.user?.email || "—"
                              : `${t.redemptions.length} students`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-sm">{formatDate(t.expires_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopy(t.token)}>
                                <Copy className="w-4 h-4 mr-2" /> Copy code
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDetailToken(t)}>
                                <KeyRound className="w-4 h-4 mr-2" /> View details
                              </DropdownMenuItem>
                              {t.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() => disableMutation.mutate(t.id)}
                                  disabled={disableMutation.isPending}
                                >
                                  <Ban className="w-4 h-4 mr-2" /> Disable
                                </DropdownMenuItem>
                              )}
                              {t.usage_count === 0 && (
                                <DropdownMenuItem
                                  onClick={() => setTokenToDelete(t)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Token Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Access Token</DialogTitle>
            <DialogDescription>
              Create a code that grants a student a discounted or free enrollment in a specific course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">100 = full access token</p>
              </div>
              <div className="space-y-1.5">
                <Label>Usage limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry date (optional)</Label>
              <Input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!formCourseId || generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Detail Dialog */}
      <Dialog open={!!detailToken} onOpenChange={() => setDetailToken(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{detailToken?.token}</DialogTitle>
            <DialogDescription>{detailToken?.course?.title}</DialogDescription>
          </DialogHeader>
          {detailToken && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{detailToken.discount_value}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Usage</span><span>{detailToken.usage_count} / {detailToken.usage_limit}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={STATUS_BADGE[detailToken.derived_status].variant}>{STATUS_BADGE[detailToken.derived_status].label}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(detailToken.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expiry</span><span>{formatDate(detailToken.expires_at)}</span></div>
              {detailToken.redemptions?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="font-medium mb-2">Redemptions</p>
                  <div className="space-y-1.5">
                    {detailToken.redemptions.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs">
                        <span>{r.user?.email || r.user_id}</span>
                        <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!tokenToDelete} onOpenChange={() => setTokenToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete access token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono">{tokenToDelete?.token}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tokenToDelete && deleteMutation.mutate(tokenToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
