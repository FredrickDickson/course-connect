import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, FileJson, FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedQuestion {
  id: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  points: number;
  answers: { id: string; answer: string; isCorrect: boolean }[];
  correctAnswer?: string;
}

interface QuizBulkImportProps {
  onImport: (questions: ImportedQuestion[]) => void;
}

const SAMPLE_CSV = `question,type,points,answer1,correct1,answer2,correct2,answer3,correct3,answer4,correct4
"What is 2+2?",multiple_choice,1,"4",true,"3",false,"5",false,"6",false
"The sun is a star.",true_false,1,"True",true,"False",false,,,,
"The capital of France is ___.",fill_blank,2,"Paris",true,,,,,,`;

const SAMPLE_JSON = JSON.stringify([
  {
    question: "What is 2+2?",
    type: "multiple_choice",
    points: 1,
    answers: [
      { answer: "4", isCorrect: true },
      { answer: "3", isCorrect: false },
      { answer: "5", isCorrect: false }
    ]
  },
  {
    question: "The sun is a star.",
    type: "true_false",
    points: 1,
    answers: [
      { answer: "True", isCorrect: true },
      { answer: "False", isCorrect: false }
    ]
  },
  {
    question: "The capital of France is ___.",
    type: "fill_blank",
    points: 2,
    correctAnswer: "Paris"
  }
], null, 2);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ImportedQuestion[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const questions: ImportedQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const q = parseRowToQuestion(cols, i);
    if (q) questions.push(q);
  }
  return questions;
}

function parseRowToQuestion(cols: string[], rowIndex: number): ImportedQuestion | null {
  const questionText = cols[0]?.replace(/^"|"$/g, '');
  if (!questionText) return null;

  const rawType = (cols[1] || 'multiple_choice').trim().toLowerCase();
  const questionType = rawType === 'true_false' ? 'true_false' : rawType === 'fill_blank' ? 'fill_blank' : 'multiple_choice';
  const points = parseInt(cols[2]) || 1;
  const ts = Date.now() + rowIndex;

  if (questionType === 'fill_blank') {
    const correctAnswer = cols[3]?.replace(/^"|"$/g, '') || '';
    return {
      id: `q_imp_${ts}`,
      question: questionText,
      questionType,
      points,
      answers: [],
      correctAnswer,
    };
  }

  const answers: ImportedQuestion['answers'] = [];
  for (let j = 3; j < cols.length; j += 2) {
    const ansText = cols[j]?.replace(/^"|"$/g, '').trim();
    if (!ansText) continue;
    const isCorrect = (cols[j + 1] || '').trim().toLowerCase() === 'true';
    answers.push({ id: `a_imp_${ts}_${j}`, answer: ansText, isCorrect });
  }

  if (answers.length === 0) return null;

  return { id: `q_imp_${ts}`, question: questionText, questionType, points, answers };
}

function parseJSON(text: string): ImportedQuestion[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.questions || [data];

  return arr.map((item: any, i: number) => {
    const ts = Date.now() + i;
    const rawType = (item.type || item.questionType || 'multiple_choice').toLowerCase();
    const questionType = rawType === 'true_false' ? 'true_false' : rawType === 'fill_blank' ? 'fill_blank' : 'multiple_choice';

    if (questionType === 'fill_blank') {
      return {
        id: `q_imp_${ts}`,
        question: item.question,
        questionType,
        points: item.points || 1,
        answers: [],
        correctAnswer: item.correctAnswer || item.correct_answer || '',
      };
    }

    const answers = (item.answers || item.options || []).map((a: any, j: number) => ({
      id: `a_imp_${ts}_${j}`,
      answer: typeof a === 'string' ? a : a.answer || a.text || a.option || '',
      isCorrect: typeof a === 'string' ? false : !!(a.isCorrect || a.is_correct || a.correct),
    }));

    return {
      id: `q_imp_${ts}`,
      question: item.question,
      questionType,
      points: item.points || 1,
      answers,
    };
  });
}

function parseExcelRows(rows: any[][]): ImportedQuestion[] {
  if (rows.length < 2) throw new Error('Excel file must have a header row and at least one data row');
  const questions: ImportedQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].map((c: any) => String(c ?? ''));
    const q = parseRowToQuestion(cols, i);
    if (q) questions.push(q);
  }
  return questions;
}

function downloadSample(format: 'csv' | 'json') {
  const content = format === 'csv' ? SAMPLE_CSV : SAMPLE_JSON;
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz_template.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelSample() {
  const wb = XLSX.utils.book_new();
  const data = [
    ['question', 'type', 'points', 'answer1', 'correct1', 'answer2', 'correct2', 'answer3', 'correct3', 'answer4', 'correct4'],
    ['What is 2+2?', 'multiple_choice', 1, '4', true, '3', false, '5', false, '6', false],
    ['The sun is a star.', 'true_false', 1, 'True', true, 'False', false, '', '', '', ''],
    ['The capital of France is ___.', 'fill_blank', 2, 'Paris', true, '', '', '', '', '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, 'quiz_template.xlsx');
}

export function QuizBulkImport({ onImport }: QuizBulkImportProps) {
  const [preview, setPreview] = useState<ImportedQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      let questions: ImportedQuestion[] = [];

      if (ext === 'json') {
        const text = await file.text();
        questions = parseJSON(text);
      } else if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        questions = parseCSV(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        questions = parseExcelRows(rows);
      } else {
        throw new Error(`Unsupported file format: .${ext}. Use CSV, JSON, or Excel (.xlsx/.xls)`);
      }

      if (questions.length === 0) {
        throw new Error('No valid questions found in the file. Check the format and try again.');
      }

      setPreview(questions);
      toast({
        title: 'File parsed successfully',
        description: `Found ${questions.length} question${questions.length !== 1 ? 's' : ''} ready to import`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      toast({
        title: 'Import Error',
        description: err.message || 'Failed to parse file',
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    onImport(preview);
    setPreview(null);
    setFileName('');
    toast({
      title: 'Questions imported',
      description: `${preview.length} question${preview.length !== 1 ? 's' : ''} added to your quiz`,
    });
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Bulk Import Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Upload a CSV, JSON, or Excel file with your questions and answers
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileName && !preview && !error && (
            <p className="text-sm text-muted-foreground">Processing: {fileName}</p>
          )}
        </div>

        {/* Download templates */}
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Download a template:</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => downloadSample('csv')} className="text-xs h-7">
              <FileText className="w-3 h-3 mr-1" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadSample('json')} className="text-xs h-7">
              <FileJson className="w-3 h-3 mr-1" /> JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadExcelSample} className="text-xs h-7">
              <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Preview: {preview.length} question{preview.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setPreview(null); setFileName(''); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmImport}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Import All
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {preview.map((q, i) => (
                <div key={q.id} className="p-2 bg-muted/50 rounded-md text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">Q{i + 1}: {q.question}</span>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {q.questionType === 'multiple_choice' ? 'MC' : q.questionType === 'true_false' ? 'T/F' : 'Fill'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{q.points}pt</Badge>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {q.questionType === 'fill_blank' ? (
                      <span>Answer: {q.correctAnswer}</span>
                    ) : (
                      <span>
                        {q.answers.map((a, j) => (
                          <span key={j} className={a.isCorrect ? 'text-green-600 font-medium' : ''}>
                            {j > 0 ? ' · ' : ''}{a.answer}{a.isCorrect ? ' ✓' : ''}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
