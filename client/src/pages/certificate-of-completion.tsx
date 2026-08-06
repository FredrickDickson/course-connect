import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Eye, Loader2, ArrowLeft } from "lucide-react";
import {
  generateCertificateOfCompletionPDF,
  downloadCertificateOfCompletion,
} from "@/lib/certificate-of-completion-generator";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";

interface CertificationData {
  id: string;
  fullName: string;
  courseTitle: string;
  issuedAt: string;
}

export default function CertificateOfCompletion() {
  const [, params] = useRoute("/certificates/completion/:certificationId");
  const certificationId = params?.certificationId || "";
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: certification, isLoading, error } = useQuery<CertificationData>({
    queryKey: ["certification", certificationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/certifications/${certificationId}`);
      return res.json();
    },
    enabled: !!certificationId,
  });

  const toPdfData = (cert: CertificationData) => ({
    fullName: cert.fullName,
    courseName: cert.courseTitle,
    issueDate: cert.issuedAt,
    certificationId: cert.id,
  });

  const generatePreview = async () => {
    if (!certification) return;
    setGenerating(true);
    try {
      const doc = await generateCertificateOfCompletionPDF(toPdfData(certification));
      const blob = doc.output("blob");
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      toast({ title: "Failed to generate preview", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!certification) return;
    setDownloading(true);
    try {
      await downloadCertificateOfCompletion(toPdfData(certification));
      toast({ title: "Certificate downloaded" });
    } catch (err) {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8">
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="text-center py-16 text-muted-foreground">
                Certificate not found.
              </div>
            )}

            {certification && (
              <>
                <h1 className="text-2xl font-bold mb-1">Certificate of Completion</h1>
                <p className="text-muted-foreground mb-6">
                  {certification.courseTitle}
                </p>

                <div className="min-h-0 mb-6">
                  {!previewUrl && !generating && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 border rounded-lg">
                      <Eye className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click below to preview your certificate
                      </p>
                      <Button onClick={generatePreview}>
                        <Eye className="h-4 w-4 mr-2" /> Generate Preview
                      </Button>
                    </div>
                  )}

                  {generating && (
                    <div className="flex items-center justify-center py-16 border rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Generating preview…</span>
                    </div>
                  )}

                  {previewUrl && (
                    <iframe
                      src={previewUrl}
                      className="w-full rounded-lg border"
                      style={{ height: "60vh" }}
                      title="Certificate of Completion Preview"
                    />
                  )}
                </div>

                <Button onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
