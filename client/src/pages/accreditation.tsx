import { Link } from "wouter";
import { Download } from "lucide-react";

const BURGUNDY = "#7a0b0b";

export default function Accreditation() {
  const files = [
    {
      name: "UK Standards V2.0",
      filename: "UK-Standards-V2.0-0423_2023-04-24-143733.pdf",
    },
    {
      name: "ASIC UK Handbook V2.2.1",
      filename: "ASIC-UK-Handbook-V2.2.1-0426.pdf",
    },
  ];

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-600 hover:underline">Home</Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-display font-semibold" style={{ color: BURGUNDY }}>Accreditation</h1>
          <p className="mt-2 text-gray-700">Official accreditation documents — professionally issued and available for download.</p>
        </header>

        <div className="space-y-4">
          {files.map((f) => (
            <div
              key={f.filename}
              className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md flex items-center justify-center bg-[rgba(122,11,11,0.08)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BURGUNDY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-medium text-gray-900">{f.name}</div>
                  <div className="text-sm text-gray-500">{f.filename}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`/uploads/${f.filename}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-md hover:opacity-95"
                  style={{ backgroundColor: BURGUNDY }}
                  download
                  rel="noopener noreferrer"
                  aria-label={`Download ${f.name}`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">Download</span>
                </a>
                <a
                  href={`/uploads/${f.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:underline"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
