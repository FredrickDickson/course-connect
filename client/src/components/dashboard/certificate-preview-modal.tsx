import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { generateCertificatePDF, downloadCertificate, type CertificateData } from "@/lib/certificate-generator";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CertificateData;
}

export default function CertificatePreviewModal({ open, onOpenChange, data }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  // Calculate certificate status
  const certificateStatus = useMemo(() => {
    const now = new Date();
    const expiryDate = new Date(data.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: "expired", label: "Expired", variant: "destructive" as const, icon: XCircle };
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring-soon", label: `Expires in ${daysUntilExpiry} days`, variant: "secondary" as const, icon: AlertTriangle };
    } else {
      return { status: "valid", label: `Valid until ${expiryDate.toLocaleDateString()}`, variant: "outline" as const, icon: CheckCircle2 };
    }
  }, [data.expiryDate]);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const doc = await generateCertificatePDF(data);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Preview generation failed:", err);
      toast({ title: "Failed to generate preview", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate preview when modal opens
  useEffect(() => {
    if (open && !previewUrl && !loading) {
      generatePreview();
    }
  }, [open]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCertificate(data);
      toast({ title: "Certificate downloaded" });
    } catch (err) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Certificate Preview</DialogTitle>
            <Badge variant={certificateStatus.variant} className="flex items-center gap-1">
              <certificateStatus.icon className="h-3 w-3" />
              {certificateStatus.label}
            </Badge>
          </div>
          <DialogDescription>
            Preview and download your membership certificate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Generating preview…</span>
            </div>
          )}

          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full rounded-lg border"
              style={{ height: "60vh" }}
              title="Certificate Preview"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
