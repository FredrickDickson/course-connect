import DOMPurify from "isomorphic-dompurify";

/**
 * Server-side HTML sanitization for user/instructor-authored rich text
 * (lesson content, discussion/reply/review bodies, assignment instructions).
 *
 * The client already sanitizes with DOMPurify's default config at render
 * time (see LecturePreview.tsx, article-stage.tsx) — this uses the same
 * library with the same default (no custom allowlist) so server-stored
 * content matches what the client already treats as safe, while adding
 * defense-in-depth: any future consumer that renders this content without
 * going through the client's sanitized components is still protected.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return html;
  return DOMPurify.sanitize(html);
}
