import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Linkedin, Compass, Download } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CertificatePreviewModal from "@/components/dashboard/certificate-preview-modal";
import type { CertificateData } from "@/lib/certificate-generator";
import { PATHWAY_TYPES, type PathwayType } from "@shared/pathways";
import { downloadCertificate } from "@/lib/certificate-generator";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseTitle: string;
  courseId: string;
}

export default function CourseCompleteModal({ open, onOpenChange, courseTitle, courseId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);

  const shareUrl = encodeURIComponent(window.location.origin + "/course/" + courseId);

  const handleDownloadCertificate = async () => {
    setLoadingCert(true);
    try {
      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError || !courseData) {
        throw new Error("Failed to fetch course data");
      }

      // Generate certificate data
      const fullName = [user?.firstName, user?.middleName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Member";

      const normaliseLevel = (level?: string | null): "associate" | "member" | "fellow" => {
        const l = (level || "").toLowerCase();
        if (l.includes("fellow")) return "fellow";
        if (l.includes("member")) return "member";
        return "associate";
      };

      const normalisePathway = (track?: string | null): PathwayType => {
        return (track || "").toLowerCase().includes("med")
          ? PATHWAY_TYPES.MEDIATION
          : PATHWAY_TYPES.ARBITRATION;
      };

      const certificateData: CertificateData = {
        fullName,
        membershipLevel: normaliseLevel(courseData.level),
        memberId: `${courseId.slice(0, 8).toUpperCase()}`,
        issueDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        pathway: normalisePathway(courseData.track),
      };

      setCertData(certificateData);

      // Best-effort: record certificate issuance
      try {
        await supabase.from("certificates").upsert(
          {
            user_id: user!.id,
            track: (courseData.track || "ARBITRATION").toUpperCase(),
            level: (courseData.level || "associate").toUpperCase(),
            pathway: "STANDARD",
            post_nominal: "",
            certificate_number: `${courseId.slice(0, 8).toUpperCase()}-${user!.id.slice(0, 6).toUpperCase()}`,
            issued_at: new Date().toISOString(),
          },
          { onConflict: "user_id,track,level" } as any,
        );
      } catch {
        // Non-fatal
      }

      // Open certificate modal
      setCertModalOpen(true);
    } catch (err) {
      console.error("Failed to prepare certificate:", err);
      toast({
        title: "Failed to load certificate",
        description: "Please try again or visit your profile.",
        variant: "destructive",
      });
    } finally {
      setLoadingCert(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Course Complete!</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">You've completed</p>
          <p className="font-semibold text-lg">{courseTitle}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleDownloadCertificate}
              disabled={loadingCert}
              className="bg-[#B91C1C] hover:bg-[#A01818]"
            >
              {loadingCert ? (
                <>Loading...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> View & Download Certificate
                </>
              )}
            </Button>
            <Button asChild variant="outline">
              <a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}>
                <Linkedin className="h-4 w-4 mr-2" /> Share on LinkedIn
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/courses"><Compass className="h-4 w-4 mr-2" /> Browse next-level courses</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {certData && (
        <CertificatePreviewModal
          open={certModalOpen}
          onOpenChange={setCertModalOpen}
          data={certData}
        />
      )}
    </>
  );
}
