import * as pdfjsLib from "pdfjs-dist";
// The `?url` suffix resolves to the final hashed asset URL via Vite's asset
// pipeline, which is more reliable across Vite/pdfjs-dist version combos than
// the `new URL(..., import.meta.url)` inline-worker pattern.
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default pdfjsLib;
