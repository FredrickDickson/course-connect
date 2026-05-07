import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from './RichTextEditor';
import { Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upsertAssignment, deleteAssignmentByLesson } from '@/lib/curriculum-mutations';

interface AssignmentBuilderProps {
  lessonId: string;
  initialAssignment?: {
    id: string;
    title: string;
    description: string;
    instructions: string;
    maxPoints: number;
    dueDate?: string;
    allowLateSubmission: boolean;
  };
  onSaved?: () => void;
  onDeleted?: () => void;
}

export function AssignmentBuilder({ lessonId, initialAssignment, onSaved, onDeleted }: AssignmentBuilderProps) {
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [description, setDescription] = useState(initialAssignment?.description || '');
  const [instructions, setInstructions] = useState(initialAssignment?.instructions || '');
  const [maxPoints, setMaxPoints] = useState(initialAssignment?.maxPoints || 100);
  const [dueDate, setDueDate] = useState(initialAssignment?.dueDate || '');
  const [allowLateSubmission, setAllowLateSubmission] = useState(initialAssignment?.allowLateSubmission ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Assignment title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!instructions.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Assignment instructions are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await upsertAssignment(lessonId, {
        title,
        description,
        instructions,
        maxPoints,
        dueDate: dueDate || null,
        allowLateSubmission,
      });
      toast({ title: 'Assignment saved', description: 'Your assignment has been saved successfully.' });
      onSaved?.();
    } catch (e: any) {
      toast({
        title: 'Error saving assignment',
        description: e?.message || 'Failed to save assignment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAssignmentByLesson(lessonId);
      setTitle('');
      setDescription('');
      setInstructions('');
      toast({ title: 'Assignment deleted' });
      onDeleted?.();
    } catch (e: any) {
      toast({
        title: 'Error deleting assignment',
        description: e?.message || 'Failed to delete assignment',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="assignment-builder">
      {/* Assignment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="assignment-title">Assignment Title *</Label>
            <Input
              id="assignment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mediation Case Study Analysis"
              data-testid="input-assignment-title"
            />
          </div>

          <div>
            <Label htmlFor="assignment-description">Brief Description</Label>
            <Textarea
              id="assignment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line summary of the assignment"
              rows={2}
              data-testid="input-assignment-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-points">Maximum Points</Label>
              <Input
                id="max-points"
                type="number"
                min="1"
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseInt(e.target.value) || 100)}
                data-testid="input-max-points"
              />
            </div>

            <div>
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <Input
                id="due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="allow-late"
              checked={allowLateSubmission}
              onCheckedChange={(checked) => setAllowLateSubmission(checked as boolean)}
              data-testid="checkbox-allow-late"
            />
            <Label htmlFor="allow-late" className="cursor-pointer">
              Allow late submissions
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Instructions *</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            content={instructions}
            onChange={setInstructions}
            placeholder="Write detailed instructions for students. What should they submit? What are the requirements?"
          />
        </CardContent>
      </Card>

      {/* Save Button - Save assignment data immediately */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {initialAssignment?.id && (
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={deleting || saving}
            data-testid="button-delete-assignment"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Assignment'}
          </Button>
        )}
        <Button onClick={handleSave} size="lg" disabled={saving} data-testid="button-save-assignment">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Save Assignment</>
          )}
        </Button>
      </div>
    </div>
  );
}
