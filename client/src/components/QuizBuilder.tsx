import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuizBulkImport } from '@/components/QuizBulkImport';
import { upsertQuiz, deleteQuizByLesson } from '@/lib/curriculum-mutations';

interface QuizQuestion {
  id: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  points: number;
  order?: number;
  answers: QuizAnswer[];
  correctAnswer?: string; // For fill-in-the-blank
}

interface QuizAnswer {
  id: string;
  answer: string;
  isCorrect: boolean;
}

interface QuizBuilderProps {
  lessonId: string;
  initialQuiz?: {
    id: string;
    title: string;
    description?: string;
    timeLimit?: number;
    passingScore: number;
    maxAttempts: number;
    questions: QuizQuestion[];
  };
  onSaved?: () => void;
  onDeleted?: () => void;
}

export function QuizBuilder({ lessonId, initialQuiz, onSaved, onDeleted }: QuizBuilderProps) {
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [timeLimit, setTimeLimit] = useState(initialQuiz?.timeLimit?.toString() || '');
  const [passingScore, setPassingScore] = useState(initialQuiz?.passingScore || 80);
  const [maxAttempts, setMaxAttempts] = useState(initialQuiz?.maxAttempts || 3);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions || []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      questionType: 'multiple_choice',
      points: 1,
      answers: [
        { id: `a_${Date.now()}_1`, answer: '', isCorrect: false },
        { id: `a_${Date.now()}_2`, answer: '', isCorrect: false },
      ],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updated = { ...q, [field]: value };
        
        // Reset answers when changing question type
        if (field === 'questionType') {
          if (value === 'true_false') {
            updated.answers = [
              { id: `a_${Date.now()}_1`, answer: 'True', isCorrect: false },
              { id: `a_${Date.now()}_2`, answer: 'False', isCorrect: false },
            ];
          } else if (value === 'fill_blank') {
            updated.answers = [];
            updated.correctAnswer = '';
          } else if (value === 'multiple_choice' && q.questionType !== 'multiple_choice') {
            updated.answers = [
              { id: `a_${Date.now()}_1`, answer: '', isCorrect: false },
              { id: `a_${Date.now()}_2`, answer: '', isCorrect: false },
            ];
          }
        }
        
        return updated;
      }
      return q;
    }));
  };

  const addAnswer = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: [
            ...q.answers,
            { id: `a_${Date.now()}`, answer: '', isCorrect: false },
          ],
        };
      }
      return q;
    }));
  };

  const removeAnswer = (questionId: string, answerId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: q.answers.filter(a => a.id !== answerId),
        };
      }
      return q;
    }));
  };

  const updateAnswer = (questionId: string, answerId: string, field: string, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const isSingleAnswer =
          field === 'isCorrect' && value === true && q.questionType === 'multiple_choice';
        return {
          ...q,
          answers: q.answers.map(a => {
            if (a.id === answerId) {
              return { ...a, [field]: value };
            }
            if (isSingleAnswer) {
              return { ...a, isCorrect: false };
            }
            return a;
          }),
        };
      }
      return q;
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Quiz title is required',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Add at least one question to the quiz',
        variant: 'destructive',
      });
      return;
    }

    // Validate each question
    for (const question of questions) {
      if (!question.question.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All questions must have text',
          variant: 'destructive',
        });
        return;
      }

      if (question.questionType === 'fill_blank') {
        if (!question.correctAnswer?.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Fill-in-the-blank questions must have a correct answer',
            variant: 'destructive',
          });
          return;
        }
      } else {
        if (question.answers.length < 2) {
          toast({
            title: 'Validation Error',
            description: 'Each question must have at least 2 answer options',
            variant: 'destructive',
          });
          return;
        }

        const hasCorrect = question.answers.some(a => a.isCorrect);
        if (!hasCorrect) {
          toast({
            title: 'Validation Error',
            description: 'Each question must have at least one correct answer',
            variant: 'destructive',
          });
          return;
        }

        for (const answer of question.answers) {
          if (!answer.answer.trim()) {
            toast({
              title: 'Validation Error',
              description: 'All answer options must have text',
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      await upsertQuiz(lessonId, {
        title,
        description,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        passingScore,
        maxAttempts,
        questions: questions.map((q, index) => ({
          question: q.question,
          questionType: q.questionType,
          points: q.points,
          order: index,
          correctAnswer: q.correctAnswer,
          answers: q.answers,
        })),
      });
      toast({ title: 'Quiz saved', description: 'Your quiz has been saved successfully.' });
      onSaved?.();
    } catch (e: any) {
      toast({
        title: 'Error saving quiz',
        description: e?.message || 'Failed to save quiz',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteQuizByLesson(lessonId);
      setTitle('');
      setDescription('');
      setQuestions([]);
      toast({ title: 'Quiz deleted' });
      onDeleted?.();
    } catch (e: any) {
      toast({
        title: 'Error deleting quiz',
        description: e?.message || 'Failed to delete quiz',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="quiz-builder">
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="quiz-title">Quiz Title *</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Module 1 Knowledge Check"
              data-testid="input-quiz-title"
            />
          </div>

          <div>
            <Label htmlFor="quiz-description">Description (Optional)</Label>
            <Textarea
              id="quiz-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the quiz"
              rows={2}
              data-testid="input-quiz-description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="time-limit">Time Limit (minutes)</Label>
              <Input
                id="time-limit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="No limit"
                data-testid="input-time-limit"
              />
            </div>

            <div>
              <Label htmlFor="passing-score">Passing Score (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 80)}
                data-testid="input-passing-score"
              />
            </div>

            <div>
              <Label htmlFor="max-attempts">Max Attempts</Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
                data-testid="input-max-attempts"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Questions</h3>
          <Button onClick={addQuestion} data-testid="button-add-question">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Bulk Import */}
        <QuizBulkImport onImport={(imported) => setQuestions(prev => [...prev, ...imported])} />

        {questions.map((question, qIndex) => (
          <Card key={question.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1 cursor-move" />
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Question {qIndex + 1} *</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                        placeholder="Enter your question here"
                        rows={2}
                        data-testid={`input-question-${qIndex}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Question Type</Label>
                        <Select
                          value={question.questionType}
                          onValueChange={(value) => updateQuestion(question.id, 'questionType', value)}
                        >
                          <SelectTrigger data-testid={`select-type-${qIndex}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True/False</SelectItem>
                            <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                          data-testid={`input-points-${qIndex}`}
                        />
                      </div>
                    </div>

                    {/* Answer Options */}
                    {question.questionType === 'fill_blank' ? (
                      <div>
                        <Label>Correct Answer *</Label>
                        <Input
                          value={question.correctAnswer || ''}
                          onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                          placeholder="Enter the correct answer"
                          data-testid={`input-correct-answer-${qIndex}`}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Answer Options</Label>
                        {question.answers.map((answer, aIndex) => (
                          <div key={answer.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={answer.isCorrect}
                              onCheckedChange={(checked) => 
                                updateAnswer(question.id, answer.id, 'isCorrect', checked)
                              }
                              data-testid={`checkbox-correct-${qIndex}-${aIndex}`}
                            />
                            <Input
                              value={answer.answer}
                              onChange={(e) => updateAnswer(question.id, answer.id, 'answer', e.target.value)}
                              placeholder={`Option ${aIndex + 1}`}
                              disabled={question.questionType === 'true_false'}
                              className="flex-1"
                              data-testid={`input-answer-${qIndex}-${aIndex}`}
                            />
                            {question.questionType !== 'true_false' && question.answers.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAnswer(question.id, answer.id)}
                                data-testid={`button-remove-answer-${qIndex}-${aIndex}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        {question.questionType === 'multiple_choice' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addAnswer(question.id)}
                            data-testid={`button-add-answer-${qIndex}`}
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Option
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  data-testid={`button-remove-question-${qIndex}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}

        {questions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No questions added yet</p>
              <Button onClick={addQuestion} variant="outline" data-testid="button-add-first-question">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Button - Validates quiz and prepares it for saving */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {initialQuiz?.id && (
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={deleting || saving}
            data-testid="button-delete-quiz"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Quiz'}
          </Button>
        )}
        <Button onClick={handleSave} size="lg" disabled={saving} data-testid="button-save-quiz">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Save Quiz</>
          )}
        </Button>
      </div>
    </div>
  );
}
