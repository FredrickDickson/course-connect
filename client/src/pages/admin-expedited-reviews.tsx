import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  UserCheck,
  Loader2,
  Search,
  Filter,
  FileText,
  Award,
  Clock,
  Briefcase,
  Shield,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type ReviewStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";
type Level = "ASSOCIATE" | "MEMBER" | "FELLOW" | "NONE";

interface ProfessionalProfileSummary {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  country?: string;
  track: "ARBITRATION" | "MEDIATION";
  yearsExperience?: number;
  adrExperience?: string;
  selfAssessedLevel: Exclude<Level, "NONE">;
  assignedLevel: Level;
  reviewStatus: ReviewStatus;
  submittedAt?: string;
  confidenceScore?: number;
  documentsCount?: number;
}

interface ProfessionalProfileDetail extends ProfessionalProfileSummary {
  experienceSummary?: string;
  qualificationsSummary?: string;
  practiceAreas?: string[];
  adrRoles?: string[];
  documents: Array<{
    id: string;
    type: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
  }>;
  history: Array<{
    id: string;
    status: ReviewStatus | "SUBMITTED";
    assignedLevel?: Level;
    note?: string;
    reviewer?: string;
    createdAt: string;
  }>;
}

interface ProfileStats {
  pending: number;
  underReview: number;
  decisionsToday: number;
}

const reviewStatusOptions: { value: "ALL" | ReviewStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "MORE_INFO_REQUIRED", label: "Needs Info" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const levelOptions: { value: "ALL" | Level; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ASSOCIATE", label: "Associate" },
  { value: "MEMBER", label: "Member" },
  { value: "FELLOW", label: "Fellow" },
];

const trackOptions = [
  { value: "ALL", label: "All Tracks" },
  { value: "ARBITRATION", label: "Arbitration" },
  { value: "MEDIATION", label: "Mediation" },
];

const statusBadges: Record<ReviewStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
  MORE_INFO_REQUIRED: { label: "Needs Info", className: "bg-blue-100 text-blue-800" },
};

function getConfidenceLabel(score?: number) {
  if (score === undefined || score === null) return { label: "Not scored", variant: "bg-muted" };
  if (score >= 80) return { label: "High", variant: "bg-emerald-100 text-emerald-800" };
  if (score >= 60) return { label: "Medium", variant: "bg-amber-100 text-amber-800" };
  return { label: "Low", variant: "bg-red-100 text-red-800" };
}

export default function AdminExpeditedReviews() {
  const { isLoading: authLoading, hasAccess } = useRoleProtection({ requiredRole: "admin", showToast: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReviewStatus>("UNDER_REVIEW");
  const [levelFilter, setLevelFilter] = useState<"ALL" | Level>("ALL");
  const [trackFilter, setTrackFilter] = useState<"ALL" | "ARBITRATION" | "MEDIATION">("ALL");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: stats, isLoading: statsLoading } = useQuery<ProfileStats>({
    queryKey: ["admin-profile-stats"],
    enabled: hasAccess,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/qualification/professional-profiles/stats");
      return response.json();
    },
  });

  const profilesQuery = useQuery<ProfessionalProfileSummary[]>({
    queryKey: ["admin-profiles", statusFilter, levelFilter, trackFilter, searchTerm],
    enabled: hasAccess,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("reviewStatus", statusFilter);
      if (levelFilter !== "ALL") params.append("level", levelFilter);
      if (trackFilter !== "ALL") params.append("track", trackFilter);
      if (searchTerm) params.append("q", searchTerm);
      const response = await apiRequest("GET", `/api/qualification/professional-profiles?${params.toString()}`);
      return response.json();
    },
  });

  const detailQuery = useQuery<ProfessionalProfileDetail>({
    queryKey: ["admin-profile-detail", selectedProfileId],
    enabled: Boolean(selectedProfileId) && drawerOpen,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/qualification/professional-profiles/${selectedProfileId}`);
      return response.json();
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async (payload: { profileId: string; action: string; note?: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/qualification/professional-profiles/${payload.profileId}/decision`,
        payload,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profile-stats"] });
      if (selectedProfileId) {
        queryClient.invalidateQueries({ queryKey: ["admin-profile-detail", selectedProfileId] });
      }
      toast({ title: "Decision recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const profiles = profilesQuery.data || [];
  const pendingBadge = stats?.underReview ?? 0;

  const handleOpenProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setDrawerOpen(true);
  };

  const handleDecision = (profileId: string, action: string, note?: string) => {
    decisionMutation.mutate({ profileId, action, note });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Qualification Engine</p>
            <h1 className="text-3xl font-semibold text-[#1C1917] mt-1">Professional Profile Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Capture experience-rich members early and upgrade them without blocking onboarding.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button asChild variant="ghost" size="sm" className="text-sm text-muted-foreground">
              <Link href="/admin" className="gap-2 flex items-center">
                ← Back to dashboard
              </Link>
            </Button>
            <Badge variant="outline" className="bg-[#1C1917] text-white border-0">
              <ShieldCheck className="w-4 h-4 mr-1" /> Admin
            </Badge>
            <Button variant="outline" className="gap-2" onClick={() => profilesQuery.refetch()}>
              <Loader2 className={cn("w-4 h-4", profilesQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <StatsGrid stats={stats} loading={statsLoading} />

        <Card className="border-[#E7E5E4] bg-white/90 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1C1917] flex items-center gap-2">
              <Filter className="w-4 h-4" /> Review Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, email, reference"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Review Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {reviewStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Level</label>
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as typeof levelFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Track</label>
              <Select value={trackFilter} onValueChange={(value) => setTrackFilter(value as typeof trackFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
                <SelectContent>
                  {trackOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Pipeline</p>
              <p className="text-base font-semibold text-[#1C1917]">{profiles.length} profiles</p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
              {pendingBadge} under review
            </Badge>
          </div>

          {profilesQuery.isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 w-full" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-1">No profiles match these filters</p>
              <p className="text-sm text-muted-foreground">
                Adjust filters or encourage experienced applicants to submit their professional profile.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F1ED]">
              {profiles.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  onOpen={handleOpenProfile}
                  loadingAction={decisionMutation.isPending && selectedProfileId === profile.id}
                  onDecision={handleDecision}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedProfileId(null);
          }
        }}
      >
        <DrawerContent className="max-w-3xl mx-auto">
          {detailQuery.isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : detailQuery.data ? (
            <ProfileDrawerView
              profile={detailQuery.data}
              onDecision={handleDecision}
              loading={decisionMutation.isPending}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">Select a profile to review.</div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function StatsGrid({ stats, loading }: { stats?: ProfileStats; loading: boolean }) {
  const items = [
    {
      title: "New submissions",
      value: stats?.pending ?? 0,
      icon: Award,
      description: "Awaiting triage",
    },
    {
      title: "Under review",
      value: stats?.underReview ?? 0,
      icon: Shield,
      description: "Need decision",
    },
    {
      title: "Decisions today",
      value: stats?.decisionsToday ?? 0,
      icon: UserCheck,
      description: "Upgrades processed",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="bg-gradient-to-br from-white to-[#F5F3EF] border-[#E7E5E4]">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{item.title}</p>
              <p className="text-3xl font-semibold text-[#1C1917] mt-2">
                {loading ? <Skeleton className="h-8 w-20" /> : item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E7E5E4]/70 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-[#1C1917]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfileRow({
  profile,
  onOpen,
  loadingAction,
  onDecision,
}: {
  profile: ProfessionalProfileSummary;
  onOpen: (id: string) => void;
  loadingAction: boolean;
  onDecision: (id: string, action: string) => void;
}) {
  const statusConfig = statusBadges[profile.reviewStatus];
  const confidence = getConfidenceLabel(profile.confidenceScore);
  const initials = useMemo(
    () => profile.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    [profile.fullName],
  );
  const submittedLabel = profile.submittedAt
    ? formatDistanceToNow(new Date(profile.submittedAt), { addSuffix: true })
    : "—";

  return (
    <div className="px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="flex-1 flex items-start gap-4">
        <Avatar className="h-12 w-12 border border-[#E7E5E4]">
          <AvatarFallback className="bg-[#1C1917] text-white text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-semibold text-[#1C1917]">{profile.fullName}</p>
            <Badge className={cn("text-xs font-medium capitalize", statusConfig.className)}>{statusConfig.label}</Badge>
            <Badge variant="outline" className="text-xs border-dashed">
              {profile.track === "ARBITRATION" ? "Arbitration" : "Mediation"}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", confidence.variant)}>{confidence.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> {profile.yearsExperience ?? "—"} yrs experience
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Self-assessed {profile.selfAssessedLevel}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {submittedLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onDecision(profile.id, "REQUEST_INFO")}
          disabled={loadingAction}
        >
          <AlertTriangle className="w-4 h-4" /> Request Info
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onDecision(profile.id, "ASSIGN_MEMBER")}
          disabled={loadingAction}
        >
          <Award className="w-4 h-4" /> Member
        </Button>
        <Button onClick={() => onOpen(profile.id)} className="gap-2">
          Review <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ProfileDrawerView({
  profile,
  onDecision,
  loading,
}: {
  profile: ProfessionalProfileDetail;
  onDecision: (id: string, action: string, note?: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [profile.id]);

  const statusConfig = statusBadges[profile.reviewStatus];

  return (
    <div className="p-6 space-y-6">
      <DrawerHeader className="px-0">
        <DrawerTitle className="text-2xl font-semibold flex items-center gap-3">
          {profile.fullName}
          <Badge className={cn("text-xs", statusConfig.className)}>{statusConfig.label}</Badge>
        </DrawerTitle>
        <DrawerDescription>
          Applying for {profile.selfAssessedLevel} on the {profile.track === "ARBITRATION" ? "Arbitration" : "Mediation"} track.
        </DrawerDescription>
      </DrawerHeader>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoTile icon={FileText} label="Experience" value={profile.experienceSummary || "No summary provided"} />
        <InfoTile icon={Briefcase} label="Qualifications" value={profile.qualificationsSummary || "No summary provided"} />
        <InfoTile icon={Shield} label="ADR Roles" value={profile.adrRoles?.join(", ") || "Not specified"} />
        <InfoTile icon={Award} label="Practice Areas" value={profile.practiceAreas?.join(", ") || "Not specified"} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#1C1917] uppercase tracking-[0.3em]">Documents</h3>
        {profile.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supporting documents uploaded.</p>
        ) : (
          <ScrollArea className="h-40 rounded-xl border border-[#E7E5E4]">
            <div className="divide-y">
              {profile.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">{doc.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline">Download</Badge>
                </a>
              ))}
            </div>
          </ScrollArea>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#1C1917] uppercase tracking-[0.3em]">History</h3>
        <div className="space-y-4">
          {profile.history.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <Separator orientation="vertical" className="h-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {entry.status.toLowerCase().replace(/_/g, " ")}
                  {entry.assignedLevel && entry.assignedLevel !== "NONE" && (
                    <span className="ml-2 uppercase text-xs font-semibold text-amber-600">{entry.assignedLevel}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.reviewer ? `by ${entry.reviewer} • ` : ""}
                  {format(new Date(entry.createdAt), "PPpp")}
                </p>
                {entry.note && <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <DrawerFooter className="gap-3">
        <div className="w-full">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Reviewer note</label>
          <textarea
            className="mt-2 w-full rounded-lg border border-[#E7E5E4] bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CA8A04]"
            rows={3}
            placeholder="Optional note for the applicant"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={loading} onClick={() => onDecision(profile.id, "REQUEST_INFO", note)}>
            Request Info
          </Button>
          <Button variant="destructive" disabled={loading} onClick={() => onDecision(profile.id, "REJECT", note)}>
            Reject
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => onDecision(profile.id, "ASSIGN_ASSOCIATE", note)}>
            Assign Associate
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-600/90"
            disabled={loading}
            onClick={() => onDecision(profile.id, "ASSIGN_MEMBER", note)}
          >
            Upgrade to Member
          </Button>
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-600/90"
            disabled={loading}
            onClick={() => onDecision(profile.id, "ASSIGN_FELLOW", note)}
          >
            Upgrade to Fellow
          </Button>
        </div>
      </DrawerFooter>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E7E5E4] p-4 bg-white/80">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm mt-2 text-foreground leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

