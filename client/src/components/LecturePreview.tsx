// @ts-nocheck
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import {
  Video,
  FileText,
  ClipboardCheck,
  FileUp,
  Download,
  Clock,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';

interface LecturePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  lessonType: 'video' | 'text' | 'quiz' | 'assignment';
}

export function LecturePreview({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  lessonType,
}: LecturePreviewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Fetch lecture content based on type
  const { data: videoData } = useQuery({
    queryKey: ['/api/lessons', lessonId, 'video'],
    enabled: open && lessonType === 'video',
  });

  const { data: articleData } = useQuery({
    queryKey: ['/api/lessons', lessonId],
    enabled: open && lessonType === 'text',
  });

  const { data: quizData } = useQuery({
    queryKey: ['/api/lessons', lessonId, 'quiz'],
    enabled: open && lessonType === 'quiz',
  });

  const { data: assignmentData } = useQuery({
    queryKey: ['/api/lessons', lessonId, 'assignment'],
    enabled: open && lessonType === 'assignment',
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['/api/lessons', lessonId, 'resources'],
    enabled: open,
  });

  const renderVideoPreview = () => {
    if (!videoData) {
      return (
        <div className="text-center py-12">
          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">No video content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-black rounded-lg overflow-hidden">
          <video
            src={videoData.videoUrl}
            controls
            className="w-full"
            data-testid="video-player"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        {videoData.duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {Math.floor(videoData.duration / 60)}:{String(videoData.duration % 60).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderArticlePreview = () => {
    if (!articleData?.articleContent) {
      return (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">No article content available</p>
        </div>
      );
    }

    return (
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: articleData.articleContent }}
        data-testid="article-content"
      />
    );
  };

  const renderQuizPreview = () => {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      return (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">No quiz content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Quiz Header */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">{quizData.title}</h3>
                {quizData.description && (
                  <p className="text-sm text-muted-foreground">{quizData.description}</p>
                )}
              </div>
              <Badge variant="outline" className="bg-white">
                {quizData.questions.length} Question{quizData.questions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              {quizData.timeLimit && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {quizData.timeLimit} min
                </span>
              )}
              <span>Passing Score: {quizData.passingScore}%</span>
              <span>Max Attempts: {quizData.maxAttempts}</span>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        {quizData.questions.map((question: any, index: number) => (
          <Card key={question.id} data-testid={`quiz-question-${index}`}>
            <CardHeader>
              <CardTitle className="text-base">
                Question {index + 1} ({question.points} point{question.points !== 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{question.question}</p>

              {question.questionType === 'fill_blank' ? (
                <div>
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    className="w-full px-3 py-2 border rounded-md"
                    data-testid={`input-answer-${index}`}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {question.answers.map((answer: any, aIndex: number) => (
                    <label
                      key={answer.id}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      data-testid={`answer-option-${index}-${aIndex}`}
                    >
                      {question.questionType === 'multiple_choice' ? (
                        <Circle className="w-5 h-5 text-gray-400" />
                      ) : (
                        <input type="checkbox" className="w-5 h-5" />
                      )}
                      <span>{answer.answer}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button size="lg" data-testid="button-submit-quiz">
            Submit Quiz
          </Button>
        </div>
      </div>
    );
  };

  const renderAssignmentPreview = () => {
    if (!assignmentData) {
      return (
        <div className="text-center py-12">
          <FileUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">No assignment content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Assignment Header */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{assignmentData.title}</h3>
              {assignmentData.description && (
                <p className="text-sm text-muted-foreground mb-4">{assignmentData.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">{assignmentData.maxPoints} Points</span>
                {assignmentData.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(assignmentData.dueDate).toLocaleString()}
                  </span>
                )}
                {assignmentData.allowLateSubmission && (
                  <Badge variant="outline" className="bg-white">
                    Late submissions allowed
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: assignmentData.instructions }}
            />
          </CardContent>
        </Card>

        {/* Rubric */}
        {assignmentData.rubric && assignmentData.rubric.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grading Rubric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentData.rubric.map((criterion: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{criterion.name}</span>
                    <Badge>{criterion.points} pts</Badge>
                  </div>
                  {criterion.description && (
                    <p className="text-sm text-muted-foreground">{criterion.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submission */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(assignmentData.submissionType === 'text' || assignmentData.submissionType === 'both') && (
              <div>
                <label className="block text-sm font-medium mb-2">Written Response</label>
                <textarea
                  placeholder="Type your submission here..."
                  rows={6}
                  className="w-full px-3 py-2 border rounded-md"
                  data-testid="textarea-submission"
                />
              </div>
            )}

            {(assignmentData.submissionType === 'file' || assignmentData.submissionType === 'both') && (
              <div>
                <label className="block text-sm font-medium mb-2">File Upload</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <input type="file" className="hidden" data-testid="input-file-upload" />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="lg" data-testid="button-submit-assignment">
                Submit Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{lessonTitle}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Preview Mode (Student View)</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Main Content */}
            {lessonType === 'video' && renderVideoPreview()}
            {lessonType === 'text' && renderArticlePreview()}
            {lessonType === 'quiz' && renderQuizPreview()}
            {lessonType === 'assignment' && renderAssignmentPreview()}

            {/* Downloadable Resources */}
            {resources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Downloadable Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resources.map((resource: any) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      data-testid={`resource-${resource.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{resource.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {resource.fileName} • {(resource.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
