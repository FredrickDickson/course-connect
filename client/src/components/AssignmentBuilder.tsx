import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from './RichTextEditor';
import { Plus, Trash2, CheckCircle2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  points: number;
}

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
    submissionType: 'text' | 'file' | 'both';
    rubric: RubricCriterion[];
  };
  onSave: (assignmentData: any) => void;
}

export function AssignmentBuilder({ lessonId, initialAssignment, onSave }: AssignmentBuilderProps) {
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [description, setDescription] = useState(initialAssignment?.description || '');
  const [instructions, setInstructions] = useState(initialAssignment?.instructions || '');
  const [maxPoints, setMaxPoints] = useState(initialAssignment?.maxPoints || 100);
  const [dueDate, setDueDate] = useState(initialAssignment?.dueDate || '');
  const [allowLateSubmission, setAllowLateSubmission] = useState(initialAssignment?.allowLateSubmission ?? true);
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>(
    initialAssignment?.submissionType || 'both'
  );
  const [rubric, setRubric] = useState<RubricCriterion[]>(initialAssignment?.rubric || []);
  const { toast } = useToast();

  const addRubricCriterion = () => {
    const newCriterion: RubricCriterion = {
      id: `r_${Date.now()}`,
      name: '',
      description: '',
      points: 10,
    };
    setRubric([...rubric, newCriterion]);
  };

  const removeRubricCriterion = (criterionId: string) => {
    setRubric(rubric.filter(r => r.id !== criterionId));
  };

  const updateRubricCriterion = (criterionId: string, field: string, value: any) => {
    setRubric(rubric.map(r => {
      if (r.id === criterionId) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleSave = () => {
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

    // Validate rubric if provided
    if (rubric.length > 0) {
      for (const criterion of rubric) {
        if (!criterion.name.trim()) {
          toast({
            title: 'Validation Error',
            description: 'All rubric criteria must have a name',
            variant: 'destructive',
          });
          return;
        }
      }

      const totalRubricPoints = rubric.reduce((sum, r) => sum + r.points, 0);
      if (totalRubricPoints !== maxPoints) {
        toast({
          title: 'Validation Warning',
          description: `Rubric total (${totalRubricPoints}) doesn't match max points (${maxPoints})`,
          variant: 'destructive',
        });
        return;
      }
    }

    const assignmentData = {
      lessonId,
      title,
      description,
      instructions,
      maxPoints,
      dueDate: dueDate || null,
      allowLateSubmission,
      submissionType,
      rubric,
    };

    onSave(assignmentData);
  };

  const totalRubricPoints = rubric.reduce((sum, r) => sum + r.points, 0);

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="submission-type">Submission Type</Label>
              <Select value={submissionType} onValueChange={(value: any) => setSubmissionType(value)}>
                <SelectTrigger data-testid="select-submission-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Only</SelectItem>
                  <SelectItem value="file">File Upload Only</SelectItem>
                  <SelectItem value="both">Text + File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
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

      {/* Grading Rubric */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grading Rubric (Optional)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define criteria for evaluating submissions
              </p>
            </div>
            <Button onClick={addRubricCriterion} variant="outline" data-testid="button-add-criterion">
              <Plus className="w-4 h-4 mr-2" />
              Add Criterion
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rubric.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Total: {totalRubricPoints} / {maxPoints} points
                </span>
              </div>
              {totalRubricPoints !== maxPoints && (
                <span className="text-sm text-orange-600">
                  ⚠ Points don't match maximum
                </span>
              )}
            </div>
          )}

          {rubric.map((criterion, index) => (
            <Card key={criterion.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label>Criterion Name *</Label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateRubricCriterion(criterion.id, 'name', e.target.value)}
                        placeholder="e.g., Research Quality, Writing Clarity"
                        data-testid={`input-criterion-name-${index}`}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={criterion.description}
                        onChange={(e) => updateRubricCriterion(criterion.id, 'description', e.target.value)}
                        placeholder="What are you looking for in this criterion?"
                        rows={2}
                        data-testid={`input-criterion-description-${index}`}
                      />
                    </div>

                    <div>
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min="1"
                        value={criterion.points}
                        onChange={(e) => updateRubricCriterion(criterion.id, 'points', parseInt(e.target.value) || 0)}
                        data-testid={`input-criterion-points-${index}`}
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRubricCriterion(criterion.id)}
                    data-testid={`button-remove-criterion-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {rubric.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="mb-2">No grading criteria defined</p>
              <p className="text-sm">Add criteria to help students understand how they'll be graded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button - Save assignment data immediately */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button onClick={handleSave} size="lg" data-testid="button-save-assignment">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Save Assignment
        </Button>
      </div>
    </div>
  );
}
