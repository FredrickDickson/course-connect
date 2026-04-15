interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = "text" }: CodeBlockProps) {
  return (
    <div className="my-4">
      <div className="bg-muted px-4 py-2 rounded-t-md border-b">
        <span className="text-sm font-mono text-muted-foreground">{language}</span>
      </div>
      <pre className="bg-slate-900 text-slate-50 p-4 rounded-b-md overflow-x-auto">
        <code className="text-sm font-mono">{code}</code>
      </pre>
    </div>
  );
}
