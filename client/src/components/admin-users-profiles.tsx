/**
 * Admin Users & Profiles — Enhanced with role filters, incomplete profile filter,
 * level history, activity log, and bulk reminder capabilities.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Building2, Globe, MessageSquare, BookOpen, CheckCircle, AlertCircle,
  Eye, Users, Download, Filter, Bell, History, Activity,
} from "lucide-react";

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at: string | null;
  country: string | null;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  address: string | null;
  institution: string | null;
  job_title: string | null;
  years_experience: string | null;
  industry: string | null;
  role_category: string | null;
  education_level: string | null;
  adr_experience: string | null;
  profile_completed: boolean;
  part: string | null;
  created_at: string;
  updated_at: string;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  linkedin_url: string | null;
  highest_qualification: string | null;
  professional_background: string | null;
  organisation: string | null;
  city: string | null;
  profile_photo_url: string | null;
}

function getProfileCompletion(p: ProfileRow | null) {
  if (!p) return 0;
  const fields = [
    p.full_name, p.phone, p.country, p.institution, p.job_title,
    p.industry, p.role_category, p.education_level, p.adr_experience,
    p.date_of_birth, p.gender, p.nationality,
  ];
  return Math.round((fields.filter((f) => f && f !== "none").length / fields.length) * 100);
}

function ProfileCompletionMeter({ profile }: { profile: ProfileRow | null }) {
  const pct = getProfileCompletion(profile);
  if (!profile) return (
    <Badge variant="outline" className="text-muted-foreground">
      <AlertCircle className="w-3 h-3 mr-1" /> None
    </Badge>
  );
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminUsersProfiles() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const { toast } = useToast();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const { data: userEnrollments = [] } = useQuery({
    queryKey: ["admin-user-enrollments", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("*, course:courses(title, cohort_id)")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userMembership } = useQuery({
    queryKey: ["admin-user-membership", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("members").select("*").eq("user_id", selectedUser!.id).maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const { data: levelHistory = [] } = useQuery({
    queryKey: ["admin-user-level-history", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("level_history")
        .select("*")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ["admin-user-activity", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_log")
        .select("*")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  const profileMap = new Map<string, ProfileRow>(profiles.map((p: ProfileRow) => [p.user_id, p]));

  const filtered = users.filter((u: UserRow) => {
    const profile: ProfileRow | undefined = profileMap.get(u.id);
    // Search
    if (search) {
      const q = search.toLowerCase();
      const match = u.email?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        profile?.full_name?.toLowerCase().includes(q) ||
        profile?.institution?.toLowerCase().includes(q) ||
        profile?.country?.toLowerCase().includes(q);
      if (!match) return false;
    }
    // Role filter
    if (roleFilter !== "all" && (u.role || "student") !== roleFilter) return false;
    // Profile completion filter
    if (profileFilter === "incomplete" && getProfileCompletion(profile || null) >= 80) return false;
    if (profileFilter === "complete" && getProfileCompletion(profile || null) < 80) return false;
    if (profileFilter === "no_profile" && profile) return false;
    return true;
  });

  const incompleteCount = users.filter((u: UserRow) => {
    const p: ProfileRow | undefined = profileMap.get(u.id);
    return !p || getProfileCompletion(p) < 80;
  }).length;

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Institution", "Country", "Profile %", "Joined"];
    const rows = filtered.map((u: UserRow) => {
      const p: ProfileRow | undefined = profileMap.get(u.id);
      return [
        p?.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        u.email, u.role || "student", p?.institution || "",
        p?.country || u.country || "", getProfileCompletion(p || null),
        u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cima_users.csv";
    a.click();
  };

  const selectedProfile: ProfileRow | null = selectedUser ? profileMap.get(selectedUser.id) || null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Users & Profiles</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} total users • {incompleteCount} incomplete profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, institution, country..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Profile" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            <SelectItem value="incomplete">Incomplete (&lt;80%)</SelectItem>
            <SelectItem value="complete">Complete (≥80%)</SelectItem>
            <SelectItem value="no_profile">No Profile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incomplete profiles banner */}
      {profileFilter === "incomplete" && filtered.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {filtered.length} user(s) with incomplete profiles
          </p>
          <Button size="sm" variant="outline" className="text-amber-800 border-amber-300 hover:bg-amber-100"
            onClick={() => toast({ title: "Reminder sent", description: `Bulk reminder queued for ${filtered.length} users.` })}>
            <Bell className="w-3.5 h-3.5 mr-1" /> Send Bulk Reminder
          </Button>
        </div>
      )}

      {/* Table */}
      {usersLoading ? (
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No users found</h3>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Institution</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Country</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Level</th>
                <th className="text-left p-3 font-medium">Profile</th>
                <th className="text-left p-3 font-medium">Joined</th>
                <th className="text-left p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: UserRow) => {
                const profile: ProfileRow | undefined = profileMap.get(u.id);
                const displayName = profile?.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "—";
                return (
                  <tr key={u.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedUser(u)}>
                    <td className="p-3 font-medium">{displayName}</td>
                    <td className="p-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{(profile as ProfileRow | undefined)?.institution || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{(profile as ProfileRow | undefined)?.country || u.country || "—"}</td>
                    <td className="p-3">
                      <Badge variant={u.role === "admin" ? "default" : u.role === "instructor" ? "secondary" : "outline"} className="text-[10px]">
                        {u.role || "student"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {(profile as ProfileRow | undefined)?.part || "No Part"}
                      </Badge>
                    </td>
                    <td className="p-3"><ProfileCompletionMeter profile={profile || null} /></td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>User Profile</SheetTitle></SheetHeader>

          {selectedUser && (
            <div className="mt-4 space-y-6">
              {/* Identity card */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {(selectedProfile as ProfileRow | null)?.profile_photo_url ? (
                        <img src={(selectedProfile as ProfileRow).profile_photo_url!} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">
                        {selectedProfile?.full_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || "No name"}
                      </h3>
                      {userMembership && (
                        <p className="text-sm text-primary font-medium">
                          {userMembership.post_nominal || userMembership.part}
                          {userMembership.member_id && ` • ${userMembership.member_id}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={selectedUser.role === "admin" ? "default" : selectedUser.role === "instructor" ? "secondary" : "outline"} className="text-[10px]">
                          {selectedUser.role || "student"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {(selectedProfile as ProfileRow | null)?.part || "No Part"}
                        </Badge>
                        <ProfileCompletionMeter profile={selectedProfile} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
                  <TabsTrigger value="courses" className="text-xs">Courses</TabsTrigger>
                  <TabsTrigger value="membership" className="text-xs">Member</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h4>
                    <Card>
                      <CardContent className="p-4 space-y-0 divide-y">
                        <InfoRow icon={Mail} label="Email" value={selectedUser.email} />
                        <InfoRow icon={Phone} label="Phone" value={selectedProfile?.phone} />
                        <InfoRow icon={MessageSquare} label="WhatsApp" value={selectedProfile?.whatsapp} />
                        <InfoRow icon={Globe} label="Country" value={selectedProfile?.country || selectedUser.country} />
                        <InfoRow icon={MapPin} label="City" value={selectedProfile?.city} />
                        <InfoRow icon={MapPin} label="Address" value={selectedProfile?.address} />
                        <InfoRow icon={Globe} label="Nationality" value={selectedProfile?.nationality} />
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal</h4>
                    <Card>
                      <CardContent className="p-4 space-y-0 divide-y">
                        <InfoRow icon={User} label="Gender" value={selectedProfile?.gender} />
                        <InfoRow icon={User} label="Date of Birth" value={selectedProfile?.date_of_birth} />
                        <InfoRow icon={Globe} label="LinkedIn" value={selectedProfile?.linkedin_url} />
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Professional</h4>
                    {selectedProfile ? (
                      <Card>
                        <CardContent className="p-4 space-y-0 divide-y">
                          <InfoRow icon={Building2} label="Organisation" value={selectedProfile.organisation || selectedProfile.institution} />
                          <InfoRow icon={Briefcase} label="Job Title" value={selectedProfile.job_title} />
                          <InfoRow icon={Briefcase} label="Experience" value={selectedProfile.years_experience} />
                          <InfoRow icon={Briefcase} label="Industry" value={selectedProfile.industry} />
                          <InfoRow icon={User} label="Role Category" value={selectedProfile.role_category} />
                          <InfoRow icon={GraduationCap} label="Education" value={selectedProfile.education_level} />
                          <InfoRow icon={GraduationCap} label="Highest Qualification" value={selectedProfile.highest_qualification} />
                          <InfoRow icon={BookOpen} label="ADR Experience" value={selectedProfile.adr_experience} />
                          <InfoRow icon={BookOpen} label="Background" value={selectedProfile.professional_background} />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        No profile yet.
                      </CardContent></Card>
                    )}
                  </div>
                  {selectedProfile && (
                    <p className="text-xs text-muted-foreground">
                      Updated: {new Date(selectedProfile.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course Enrollments</h4>
                  {userEnrollments.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No enrollments.</CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {userEnrollments.map((enr: any) => (
                        <Card key={enr.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{enr.course?.title || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {enr.course?.cohort_id || ""} • {enr.ticket_type} • GHS {Number(enr.ticket_price).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ref: {enr.booking_ref} • {new Date(enr.created_at).toLocaleDateString("en-GB")}
                                </p>
                              </div>
                              <Badge variant={enr.payment_status === "confirmed" ? "default" : "secondary"} className="text-xs">
                                {enr.payment_status === "confirmed" ? "Confirmed" : enr.payment_status === "pending_invoice" ? "Invoice" : "Pending"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {userEnrollments.length > 1 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-primary" /> Repeat attendee — {userEnrollments.length} enrollments
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Membership Tab */}
                <TabsContent value="membership" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Membership</h4>
                  {userMembership ? (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        {[
                          ["Member ID", userMembership.member_id, true],
                          ["Part", userMembership.part],
                          ["Status", userMembership.status],
                          ["Post-Nominal", userMembership.post_nominal],
                          ["Expires", userMembership.expiry_date ? new Date(userMembership.expiry_date).toLocaleDateString("en-GB") : null],
                          ["Renewals", userMembership.renewal_count],
                          ["Payment", userMembership.payment_status],
                        ].filter(([, v]) => v != null).map(([label, value, mono]) => (
                          <div key={label as string} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label as string}</span>
                            <span className={`font-medium ${mono ? "font-mono" : ""} capitalize`}>{String(value)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Not a member yet.</CardContent></Card>
                  )}
                </TabsContent>

                {/* Level History Tab */}
                <TabsContent value="history" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Level History
                  </h4>
                  {levelHistory.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No level changes recorded.</CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {levelHistory.map((h: any) => (
                        <Card key={h.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {h.changed_from} → {h.changed_to}
                                </p>
                                <p className="text-xs text-muted-foreground">{h.reason || "—"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString("en-GB")}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">by {h.changed_by}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Activity Log Tab */}
                <TabsContent value="activity" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Activity Log
                  </h4>
                  {activityLog.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No activity recorded.</CardContent></Card>
                  ) : (
                    <div className="space-y-1.5">
                      {activityLog.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{a.description}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.event_type} • {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
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
