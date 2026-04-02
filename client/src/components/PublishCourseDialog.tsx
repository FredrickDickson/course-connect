// @ts-nocheck
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const queryClient = useQueryClient();

  // Fetch validation status from Supabase directly
  const { data: validation, isLoading } = useQuery({
    queryKey: ['course-validation', courseId],
    queryFn: async () => {
      // Fetch course details
      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .select('title, description, price, category_id, thumbnail_url')
        .eq('id', courseId)
        .single();
      if (courseErr) throw courseErr;

      // Fetch modules
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);

      // Fetch lessons
      const moduleIds = (modules || []).map(m => m.id);
      let lessons: any[] = [];
      if (moduleIds.length > 0) {
        const { data } = await supabase
          .from('lessons')
          .select('id, content_type, video_url')
          .in('module_id', moduleIds);
        lessons = data || [];
      }

      const checks = {
        hasTitle: !!course?.title?.trim(),
        hasDescription: !!course?.description?.trim(),
        hasPrice: course?.price != null && course.price >= 0,
        hasCategory: !!course?.category_id,
        hasThumbnail: !!course?.thumbnail_url,
        hasModules: (modules || []).length > 0,
        hasLectures: lessons.length > 0,
        hasVideoContent: lessons.some(l => l.content_type === 'video'),
      };

      const errors: string[] = [];
      if (!checks.hasTitle) errors.push('Course needs a title');
      if (!checks.hasDescription) errors.push('Course needs a description');
      if (!checks.hasCategory) errors.push('Course needs a category');
      if (!checks.hasModules) errors.push('Add at least one section');
      if (!checks.hasLectures) errors.push('Add at least one lecture');

      return { checks, errors, isValid: errors.length === 0 };
    },
    enabled: open,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !isPublished })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-validation', courseId] });
      toast({
        title: isPublished ? 'Course Unpublished' : 'Course Published!',
        description: isPublished ? 'Your course is now hidden from students.' : 'Your course is now live and visible to students.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed',
        description: error.message || 'Operation failed',
        variant: 'destructive',
      });
    },
  });

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
            {!isPublished && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Course Readiness Checklist</h3>
                  <div className="space-y-2">
                    {checkItems.map((item) => (
                      <div key={item.key} className="flex items-center gap-3 p-3 border rounded-lg">
                        {item.checked ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={item.checked ? '' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isValid ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your course is ready to be published!
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

            {isPublished && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Unpublishing will immediately hide your course from students.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!isPublished && !isValid}
                variant={isPublished ? 'destructive' : 'default'}
              >
                {publishMutation.isPending
                  ? (isPublished ? 'Unpublishing...' : 'Publishing...')
                  : (isPublished ? 'Unpublish Course' : 'Publish Course')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
