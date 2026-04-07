/**
 * Admin Users & Profiles Table
 * Shows users with slide-out biodata drawer from profiles table
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  Globe,
  MessageSquare,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Eye,
  Users,
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
  created_at: string;
  updated_at: string;
}

function ProfileCompletionMeter({ profile }: { profile: ProfileRow | null }) {
  if (!profile) return (
    <Badge variant="outline" className="text-muted-foreground">
      <AlertCircle className="w-3 h-3 mr-1" /> No profile
    </Badge>
  );

  const fields = [
    profile.full_name, profile.phone, profile.country, profile.institution,
    profile.job_title, profile.industry, profile.role_category,
    profile.education_level, profile.adr_experience,
  ];
  const filled = fields.filter((f) => f && f !== "none").length;
  const pct = Math.round((filled / fields.length) * 100);

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
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*");
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  // Fetch enrollment history for selected user
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

  // Fetch membership for selected user
  const { data: userMembership } = useQuery({
    queryKey: ["admin-user-membership", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("members")
        .select("*")
        .eq("user_id", selectedUser!.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

  const filtered = users.filter((u: UserRow) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const profile = profileMap.get(u.id);
    return (
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      profile?.full_name?.toLowerCase().includes(q) ||
      profile?.institution?.toLowerCase().includes(q) ||
      profile?.country?.toLowerCase().includes(q)
    );
  });

  const selectedProfile = selectedUser ? profileMap.get(selectedUser.id) || null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users & Profiles</h2>
        <Badge variant="secondary">{users.length} users</Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, institution, country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {usersLoading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
          </CardContent>
        </Card>
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
                <th className="text-left p-3 font-medium">Profile</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: UserRow) => {
                const profile = profileMap.get(u.id);
                const displayName = profile?.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "—";
                return (
                  <tr key={u.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedUser(u)}>
                    <td className="p-3 font-medium">{displayName}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{profile?.institution || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{profile?.country || u.country || "—"}</td>
                    <td className="p-3">
                      <Badge variant={u.role === "admin" ? "default" : u.role === "instructor" ? "secondary" : "outline"}>
                        {u.role || "student"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <ProfileCompletionMeter profile={profile || null} />
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Biodata Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Profile</SheetTitle>
          </SheetHeader>

          {selectedUser && (
            <div className="mt-4 space-y-6">
              {/* Identity Card */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">
                        {selectedProfile?.full_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || "No name"}
                      </h3>
                      {userMembership && (
                        <p className="text-sm text-primary font-medium">
                          {userMembership.post_nominal || userMembership.membership_level}
                          {userMembership.member_id && ` • ID: ${userMembership.member_id}`}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant={selectedUser.role === "admin" ? "default" : selectedUser.role === "instructor" ? "secondary" : "outline"}>
                          {selectedUser.role || "student"}
                        </Badge>
                        <ProfileCompletionMeter profile={selectedProfile} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                  <TabsTrigger value="courses" className="flex-1">Courses</TabsTrigger>
                  <TabsTrigger value="membership" className="flex-1">Membership</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  {/* Contact Information */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact Information</h4>
                    <Card>
                      <CardContent className="p-4 space-y-0 divide-y">
                        <InfoRow icon={Mail} label="Email" value={selectedUser.email} />
                        <InfoRow icon={Phone} label="Phone" value={selectedProfile?.phone} />
                        <InfoRow icon={MessageSquare} label="WhatsApp" value={selectedProfile?.whatsapp} />
                        <InfoRow icon={Globe} label="Country" value={selectedProfile?.country || selectedUser.country} />
                        <InfoRow icon={MapPin} label="Address" value={selectedProfile?.address} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Professional Information */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Professional Profile</h4>
                    {selectedProfile ? (
                      <Card>
                        <CardContent className="p-4 space-y-0 divide-y">
                          <InfoRow icon={Building2} label="Institution / Firm" value={selectedProfile.institution} />
                          <InfoRow icon={Briefcase} label="Job Title" value={selectedProfile.job_title} />
                          <InfoRow icon={Briefcase} label="Years of Experience" value={selectedProfile.years_experience} />
                          <InfoRow icon={Briefcase} label="Industry" value={selectedProfile.industry} />
                          <InfoRow icon={User} label="Role Category" value={selectedProfile.role_category} />
                          <InfoRow icon={GraduationCap} label="Education Level" value={selectedProfile.education_level} />
                          <InfoRow icon={BookOpen} label="ADR Experience" value={
                            selectedProfile.adr_experience === "none" ? "None" :
                            selectedProfile.adr_experience === "beginner" ? "Beginner" :
                            selectedProfile.adr_experience === "intermediate" ? "Intermediate" :
                            selectedProfile.adr_experience === "advanced" ? "Advanced" :
                            selectedProfile.adr_experience
                          } />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground text-sm">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                          No professional profile yet. The user will create one during enrollment.
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {selectedProfile && (
                    <p className="text-xs text-muted-foreground">
                      Profile last updated: {new Date(selectedProfile.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course Enrollments</h4>
                  {userEnrollments.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-sm">
                        No course enrollments found.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {userEnrollments.map((enr: any) => (
                        <Card key={enr.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm text-foreground">{enr.course?.title || "Unknown Course"}</p>
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
                          <CheckCircle className="w-3 h-3 text-primary" />
                          Repeat attendee — {userEnrollments.length} enrollments
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Membership Tab */}
                <TabsContent value="membership" className="space-y-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Membership Details</h4>
                  {userMembership ? (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Member ID</span>
                          <span className="font-mono font-medium">{userMembership.member_id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Level</span>
                          <Badge variant="secondary" className="capitalize">{userMembership.membership_level}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={userMembership.status === "active" ? "default" : "outline"} className="capitalize">
                            {userMembership.status}
                          </Badge>
                        </div>
                        {userMembership.post_nominal && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Post-Nominal</span>
                            <span className="font-medium">{userMembership.post_nominal}</span>
                          </div>
                        )}
                        {userMembership.expiry_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Expires</span>
                            <span className="font-medium">{new Date(userMembership.expiry_date).toLocaleDateString("en-GB")}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Renewals</span>
                          <span className="font-medium">{userMembership.renewal_count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-sm">
                        Not a member yet.
                      </CardContent>
                    </Card>
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
