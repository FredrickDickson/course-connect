import { useState } from 'react';
import { FileUp, File, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface ResourceUploaderProps {
  lessonId: string;
}

interface Resource {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

export function ResourceUploader({ lessonId }: ResourceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const { toast } = useToast();

  // Fetch existing resources
  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['/api/lessons', lessonId, 'resources'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const res = await fetch(`/api/instructor/resources/${resourceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete resource');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons', lessonId, 'resources'] });
      toast({
        title: 'Success',
        description: 'Resource deleted successfully',
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resource', file);
      formData.append('title', resourceTitle || file.name);

      const res = await fetch(`/api/instructor/lessons/${lessonId}/resources`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Upload failed');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/lessons', lessonId, 'resources'] });

      toast({
        title: 'Success',
        description: 'Resource uploaded successfully',
      });

      setResourceTitle('');
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading resource:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload resource',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4" data-testid="resource-uploader">
      <div className="border rounded-lg p-4 bg-gray-50">
        <Label htmlFor="resource-title" className="mb-2 block">Resource Title (Optional)</Label>
        <Input
          id="resource-title"
          value={resourceTitle}
          onChange={(e) => setResourceTitle(e.target.value)}
          placeholder="e.g., Course Handout, Practice Worksheet"
          className="mb-3"
          data-testid="input-resource-title"
        />

        <input
          type="file"
          id="resource-upload"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
          data-testid="input-resource-file"
        />
        <label htmlFor="resource-upload">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => document.getElementById('resource-upload')?.click()}
            data-testid="button-upload-resource"
          >
            <Plus className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Add Resource'}
          </Button>
        </label>
      </div>

      {resources.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Uploaded Resources</h4>
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-white"
              data-testid={`resource-item-${resource.id}`}
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{resource.title}</p>
                  <p className="text-xs text-gray-500">
                    {resource.fileName} • {formatFileSize(resource.fileSize)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(resource.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-${resource.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No resources uploaded yet</p>
        </div>
      )}
    </div>
  );
}
