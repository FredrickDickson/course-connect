import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UserCircle2, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InstructorProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  title?: string;
  expertise?: string[];
  education?: string;
  certifications?: string;
  website_url?: string;
  linkedin_url?: string;
  profile_image_url?: string;
  is_verified?: boolean;
}

export default function AdminInstructorProfile() {
  const [, params] = useRoute("/admin/instructors/:instructorId/profile");
  const instructorId = params?.instructorId;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [expertise, setExpertise] = useState("");
  const [education, setEducation] = useState("");
  const [certifications, setCertifications] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const { data, isLoading } = useQuery<InstructorProfileData>({
    queryKey: ["admin-instructor-profile", instructorId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/instructors/${instructorId}`);
      return await res.json();
    },
    enabled: !!instructorId,
  });

  useEffect(() => {
    if (data) {
      setBio(data.bio || "");
      setTitle(data.title || "");
      setExpertise((data.expertise || []).join(", "));
      setEducation(data.education || "");
      setCertifications(data.certifications || "");
      setWebsiteUrl(data.website_url || "");
      setLinkedinUrl(data.linkedin_url || "");
      setProfileImageUrl(data.profile_image_url || "");
      setIsVerified(Boolean(data.is_verified));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        bio: bio || null,
        title: title || null,
        expertise: expertise
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        education: education || null,
        certifications: certifications || null,
        websiteUrl: websiteUrl || null,
        linkedinUrl: linkedinUrl || null,
        profileImageUrl: profileImageUrl || null,
        isVerified,
      };

      const res = await apiRequest("PUT", `/api/admin/instructors/${instructorId}/profile`, payload);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructor-profile", instructorId] });
      toast({ title: "Profile updated", description: "The instructor profile was updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2c2015]">Instructor Profile</h1>
            <p className="text-sm text-[#6b5d4f] mt-1">
              Manage the instructor’s public profile, bio, and credibility details on their behalf.
            </p>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" />
              {data?.first_name} {data?.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Professional title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Instructor" />
              </div>
              <div className="space-y-2">
                <Label>Profile image URL</Label>
                <Input value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} placeholder="Write the instructor bio that appears on their course pages." />
            </div>

            <div className="space-y-2">
              <Label>Expertise</Label>
              <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Arbitration, Mediation, Leadership" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Education</Label>
                <Textarea value={education} onChange={(e) => setEducation(e.target.value)} rows={3} placeholder="Education and academic background" />
              </div>
              <div className="space-y-2">
                <Label>Certifications</Label>
                <Textarea value={certifications} onChange={(e) => setCertifications(e.target.value)} rows={3} placeholder="Relevant certifications and qualifications" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Verified instructor</Label>
                <p className="text-sm text-muted-foreground">Mark this instructor as verified for public trust.</p>
              </div>
              <Switch checked={isVerified} onCheckedChange={setIsVerified} />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              These details appear across the instructor profile and course pages.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
