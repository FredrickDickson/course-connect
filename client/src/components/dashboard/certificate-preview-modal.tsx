import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2 } from "lucide-react";
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
          <DialogTitle>Certificate Preview</DialogTitle>
          <DialogDescription>
            Preview and download your membership certificate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {!previewUrl && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Eye className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click below to preview your certificate</p>
              <Button onClick={generatePreview}>
                <Eye className="h-4 w-4 mr-2" /> Generate Preview
              </Button>
            </div>
          )}

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
