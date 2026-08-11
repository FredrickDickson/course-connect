import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle2, Trash2, Loader2, Eye, Presentation as PresentationIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { upsertPresentation, deletePresentationByLesson } from '@/lib/curriculum-mutations';
import { LazyPresentationViewer } from '@/components/learn/LazyPresentationViewer';
import pdfjsLib from '@/lib/pdfjs';

interface PresentationBuilderProps {
  lessonId: string;
  initialPresentation?: {
    id: string;
    fileUrl: string;
    fileName: string;
    fileType: 'pdf' | 'pptx';
    pageCount?: number | null;
    allowDownload: boolean;
  } | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, matches the lesson-presentations bucket limit

export function PresentationBuilder({ lessonId, initialPresentation, onSaved, onDeleted }: PresentationBuilderProps) {
  const [fileUrl, setFileUrl] = useState(initialPresentation?.fileUrl || '');
  const [fileName, setFileName] = useState(initialPresentation?.fileName || '');
  const [pageCount, setPageCount] = useState<number | null>(initialPresentation?.pageCount ?? null);
  const [allowDownload, setAllowDownload] = useState(initialPresentation?.allowDownload ?? false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pptxError, setPptxError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPptxError(null);

    const isPptx =
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.pptx');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPptx) {
      const message =
        "PowerPoint (PPTX) isn't supported yet — please export your slides to PDF (File > Export > PDF in PowerPoint) and upload that instead.";
      setPptxError(message);
      toast({ title: 'PPTX not supported yet', description: message, variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!isPdf) {
      toast({ title: 'Invalid file type', description: 'Please upload a PDF file', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: 'File too large', description: 'Maximum file size is 100MB', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const filePath = `${lessonId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('lesson-presentations')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      setProgress(70);

      const { data: signedData, error: signError } = await supabase.storage
        .from('lesson-presentations')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
      if (signError) throw signError;
      const url = signedData?.signedUrl;
      if (!url) throw new Error('Failed to generate a URL for the uploaded file');
      setProgress(85);

      let detectedPages: number | null = null;
      try {
        const pdf = await pdfjsLib.getDocument({ url }).promise;
        detectedPages = pdf.numPages;
      } catch (err) {
        console.error('Failed to detect slide count:', err);
      }

      setFileUrl(url);
      setFileName(file.name);
      setPageCount(detectedPages);
      setProgress(100);

      toast({ title: 'Success', description: 'Presentation uploaded successfully' });
    } catch (error) {
      console.error('Presentation upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload presentation',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplace = () => {
    setFileUrl('');
    setFileName('');
    setPageCount(null);
  };

  const handleSave = async () => {
    if (!fileUrl) {
      toast({ title: 'Validation Error', description: 'Please upload a PDF presentation first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await upsertPresentation(lessonId, {
        fileUrl,
        fileName,
        fileType: 'pdf',
        pageCount,
        allowDownload,
      });
      toast({ title: 'Presentation saved', description: 'Your presentation has been saved successfully.' });
      onSaved?.();
    } catch (e: any) {
      toast({
        title: 'Error saving presentation',
        description: e?.message || 'Failed to save presentation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this presentation? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deletePresentationByLesson(lessonId);
      setFileUrl('');
      setFileName('');
      setPageCount(null);
      setAllowDownload(false);
      toast({ title: 'Presentation deleted' });
      onDeleted?.();
    } catch (e: any) {
      toast({
        title: 'Error deleting presentation',
        description: e?.message || 'Failed to delete presentation',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="presentation-builder">
      <Card>
        <CardHeader>
          <CardTitle>Presentation File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploading ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <PresentationIcon className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
              <p className="font-medium mb-3">Uploading presentation...</p>
              <Progress value={progress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
            </div>
          ) : !fileUrl ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-presentation"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Upload PPTX or PDF</h3>
              <p className="text-sm text-muted-foreground mt-1">Click to select a PDF presentation (max 100MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-presentation-file"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20" data-testid="upload-complete">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-200">File: {fileName}</p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {pageCount != null ? `Slides detected: ${pageCount}` : 'Detecting slide count…'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} data-testid="button-preview-presentation">
                    <Eye className="w-4 h-4 mr-1" /> Preview Presentation
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReplace} data-testid="button-change-presentation">
                    <Upload className="w-4 h-4 mr-1" /> Replace
                  </Button>
                </div>
              </div>
            </div>
          )}

          {pptxError && (
            <div
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200"
              data-testid="text-pptx-unsupported"
            >
              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{pptxError}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="allow-download"
              checked={allowDownload}
              onCheckedChange={(checked) => setAllowDownload(checked as boolean)}
              data-testid="checkbox-allow-download"
            />
            <Label htmlFor="allow-download" className="cursor-pointer">
              Allow students to download this presentation
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {initialPresentation?.id && (
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={deleting || saving}
            data-testid="button-delete-presentation"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Presentation'}
          </Button>
        )}
        <Button onClick={handleSave} size="lg" disabled={saving || !fileUrl} data-testid="button-save-presentation">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Presentation
            </>
          )}
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{fileName || 'Presentation Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[400px]">
            {fileUrl && previewOpen && (
              <LazyPresentationViewer fileUrl={fileUrl} fileName={fileName} allowDownload={allowDownload} className="h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
