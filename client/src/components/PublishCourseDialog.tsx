// @ts-nocheck
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Rocket } from 'lucide-react';

interface PublishCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  isPublished: boolean;
}

export function PublishCourseDialog({
  open,
  onOpenChange,
  courseId,
  isPublished,
}: PublishCourseDialogProps) {
  const { toast } = useToast();

  // Fetch validation status
  const { data: validation, isLoading } = useQuery({
    queryKey: ['/api/instructor/courses', courseId, 'validation'],
    enabled: open,
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/instructor/courses/${courseId}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses', courseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses', courseId, 'validation'] });
      toast({
        title: 'Course Published!',
        description: 'Your course is now live and visible to students.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Publishing Failed',
        description: error.message || 'Failed to publish course',
        variant: 'destructive',
      });
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/instructor/courses/${courseId}/unpublish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses', courseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses', courseId, 'validation'] });
      toast({
        title: 'Course Unpublished',
        description: 'Your course is now hidden from students.',
      });
      onOpenChange(false);
    },
  });

  const handlePublish = () => {
    if (isPublished) {
      unpublishMutation.mutate();
    } else {
      publishMutation.mutate();
    }
  };

  const checks = validation?.checks || {};
  const errors = validation?.errors || [];
  const isValid = validation?.isValid || false;

  const checkItems = [
    { key: 'hasTitle', label: 'Course has a title', checked: checks.hasTitle },
    { key: 'hasDescription', label: 'Course has a description', checked: checks.hasDescription },
    { key: 'hasPrice', label: 'Course has a price set', checked: checks.hasPrice },
    { key: 'hasCategory', label: 'Course is assigned to a category', checked: checks.hasCategory },
    { key: 'hasThumbnail', label: 'Course has a thumbnail image', checked: checks.hasThumbnail },
    { key: 'hasModules', label: 'At least one section added', checked: checks.hasModules },
    { key: 'hasLectures', label: 'At least one lecture added', checked: checks.hasLectures },
    { key: 'hasVideoContent', label: 'At least one video lecture added', checked: checks.hasVideoContent },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            {isPublished ? 'Unpublish Course' : 'Publish Course'}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Unpublishing will hide your course from students.'
              : 'Make your course live and available to students.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Checking course readiness...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Validation Checklist */}
            {!isPublished && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Course Readiness Checklist</h3>
                  <div className="space-y-2">
                    {checkItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                        data-testid={`check-${item.key}`}
                      >
                        {item.checked ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={item.checked ? '' : 'text-muted-foreground'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Status */}
                {isValid ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your course is ready to be published! All requirements are met.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <p className="font-semibold mb-2">Please complete the following:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Unpublish Warning */}
            {isPublished && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Unpublishing this course will immediately hide it from students. Enrolled
                  students will lose access until you republish it.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!isPublished && !isValid}
                data-testid="button-confirm-publish"
                variant={isPublished ? 'destructive' : 'default'}
              >
                {publishMutation.isPending || unpublishMutation.isPending
                  ? isPublished
                    ? 'Unpublishing...'
                    : 'Publishing...'
                  : isPublished
                  ? 'Unpublish Course'
                  : 'Publish Course'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
