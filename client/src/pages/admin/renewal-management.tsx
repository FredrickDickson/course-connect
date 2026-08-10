/**
 * Admin Renewal Management Dashboard
 * Comprehensive interface for managing certificate renewals
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
  Send,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react";

interface RenewalStats {
  member_status: Array<{ status: string; count: number }>;
  email_activity_last_30_days: Array<{ template_type: string; count: number }>;
  renewal_activity_last_30_days: Array<{ status: string; count: number }>;
  upcoming_expirations: {
    next_7_days: number;
    next_30_days: number;
    next_60_days: number;
  };
}

interface UpcomingRenewal {
  member_id: string;
  full_name: string;
  email: string;
  part: string;
  expiry_date: string;
  status: string;
  income_tier: string;
}

interface EmailLog {
  id: string;
  member_id: string;
  template_type: string;
  sent_at: string;
  email_to: string;
  subject: string;
  members: {
    member_id: string;
    full_name: string;
    email: string;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RenewalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState<string>("30");
  const [selectedStage, setSelectedStage] = useState<string>("30days");

  // Fetch renewal statistics
  const { data: stats, isLoading: statsLoading } = useQuery<RenewalStats>({
    queryKey: ["renewal-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/renewal-automation/stats");
      const result = await response.json();
      return result;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch upcoming renewals
  const { data: upcomingRenewals, isLoading: renewalsLoading } = useQuery<{
    members: UpcomingRenewal[];
  }>({
    queryKey: ["upcoming-renewals", selectedDays],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/renewal-automation/upcoming-renewals?days=${selectedDays}`
      );
      const result = await response.json();
      return result;
    },
  });

  // Fetch email logs
  const { data: emailLogs, isLoading: logsLoading } = useQuery<{
    logs: EmailLog[];
  }>({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/renewal-automation/email-logs?limit=50"
      );
      const result = await response.json();
      return result;
    },
  });

  // Process reminders mutation
  const processRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/renewal-automation/process-reminders"
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Renewal reminders processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["renewal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process reminders",
        variant: "destructive",
      });
    },
  });

  // Process specific stage mutation
  const processStageMutation = useMutation({
    mutationFn: async (stage: string) => {
      const response = await apiRequest(
        "POST",
        "/api/renewal-automation/process-stage",
        { stage }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Processed ${data.stats.sent} reminders for ${data.stage}`,
      });
      queryClient.invalidateQueries({ queryKey: ["renewal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process stage",
        variant: "destructive",
      });
    },
  });

  // Update statuses mutation
  const updateStatusesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/renewal-automation/update-statuses"
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member statuses updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["renewal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-renewals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update statuses",
        variant: "destructive",
      });
    },
  });

  const totalMembers =
    stats?.member_status.reduce((acc, s) => acc + s.count, 0) || 0;
  const activeMembers =
    stats?.member_status.find((s) => s.status === "active")?.count || 0;
  const expiringMembers =
    stats?.member_status.find((s) => s.status === "expiring")?.count || 0;
  const expiredMembers =
    stats?.member_status.find((s) => s.status === "expired")?.count || 0;

  const emailsSentLast30Days =
    stats?.email_activity_last_30_days.reduce((acc, e) => acc + e.count, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Renewal Management</h1>
            <p className="text-muted-foreground mt-1">
              Automated certificate renewal system dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => updateStatusesMutation.mutate()}
              disabled={updateStatusesMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${updateStatusesMutation.isPending ? "animate-spin" : ""}`}
              />
              Update Statuses
            </Button>
            <Button
              onClick={() => processRemindersMutation.mutate()}
              disabled={processRemindersMutation.isPending}
            >
              <Send
                className={`h-4 w-4 mr-2 ${processRemindersMutation.isPending ? "animate-spin" : ""}`}
              />
              Process All Reminders
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeMembers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {expiringMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.upcoming_expirations.next_7_days || 0} in next 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {expiredMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Requires renewal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Emails Sent (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{emailsSentLast30Days}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Renewal reminders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Renewals</TabsTrigger>
            <TabsTrigger value="email-logs">Email Logs</TabsTrigger>
            <TabsTrigger value="manual">Manual Actions</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Upcoming Renewals Tab */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Renewals</CardTitle>
                    <CardDescription>
                      Members with expiring certificates
                    </CardDescription>
                  </div>
                  <Select value={selectedDays} onValueChange={setSelectedDays}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Next 7 days</SelectItem>
                      <SelectItem value="30">Next 30 days</SelectItem>
                      <SelectItem value="60">Next 60 days</SelectItem>
                      <SelectItem value="90">Next 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {renewalsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : upcomingRenewals?.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming renewals in this period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingRenewals?.members.map((member) => {
                        const daysLeft = getDaysUntilExpiry(member.expiry_date);
                        return (
                          <TableRow key={member.member_id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {member.full_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.member_id}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {member.part.charAt(0).toUpperCase() +
                                  member.part.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(member.expiry_date)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  daysLeft <= 7
                                    ? "destructive"
                                    : daysLeft <= 30
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {daysLeft} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  member.status === "active"
                                    ? "default"
                                    : member.status === "expiring"
                                      ? "default"
                                      : "destructive"
                                }
                              >
                                {member.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {member.income_tier === "HIGH_INCOME"
                                  ? "High Income"
                                  : "Lower-Middle Income"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Logs Tab */}
          <TabsContent value="email-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Activity Log</CardTitle>
                <CardDescription>
                  Recent renewal reminder emails sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : emailLogs?.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No email logs found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Subject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs?.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.sent_at).toLocaleString("en-GB")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {log.members.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {log.members.member_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.template_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {log.subject}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Actions Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Reminder Processing</CardTitle>
                <CardDescription>
                  Process reminders for specific stages manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedStage}
                    onValueChange={setSelectedStage}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60days">60 Days Before Expiry</SelectItem>
                      <SelectItem value="30days">30 Days Before Expiry</SelectItem>
                      <SelectItem value="7days">7 Days Before Expiry</SelectItem>
                      <SelectItem value="today">Expiry Day</SelectItem>
                      <SelectItem value="30days_overdue">
                        30 Days Overdue
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => processStageMutation.mutate(selectedStage)}
                    disabled={processStageMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Process Stage
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will send reminder emails to all members at the selected
                  stage who haven't received this reminder yet.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Member Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.member_status.map((status) => (
                      <div
                        key={status.status}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {status.status === "active" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {status.status === "expiring" && (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                          {status.status === "expired" && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="capitalize">{status.status}</span>
                        </div>
                        <Badge variant="secondary">{status.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Activity (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.email_activity_last_30_days.map((email) => (
                      <div
                        key={email.template_type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{email.template_type}</span>
                        <Badge variant="outline">{email.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Expirations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {stats?.upcoming_expirations.next_7_days}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Next 7 Days
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {stats?.upcoming_expirations.next_30_days}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Next 30 Days
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {stats?.upcoming_expirations.next_60_days}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Next 60 Days
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
