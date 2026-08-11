import { Fragment } from "react";

type Block = { type: "p" | "ul"; lines: string[] };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const bulletMatch = line.match(/^[*-]\s+(.*)/);
    const last = blocks[blocks.length - 1];

    if (bulletMatch) {
      if (last?.type === "ul") {
        last.lines.push(bulletMatch[1]);
      } else {
        blocks.push({ type: "ul", lines: [bulletMatch[1]] });
      }
    } else if (last?.type === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }

  return blocks;
}

/**
 * Renders plain text that may contain markdown-style bullet lines (`* ` or
 * `- `) as real paragraphs and <ul> lists, instead of dumping raw text where
 * HTML's whitespace collapsing squashes every line (and bullet marker) onto
 * one line.
 */
export function FormattedText({ text, className }: { text?: string | null; className?: string }) {
  if (!text || !text.trim()) return null;

  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Fragment key={i}>
          {block.type === "ul" ? (
            <ul className="list-disc pl-5 space-y-1 mb-3 last:mb-0">
              {block.lines.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 last:mb-0">{block.lines.join(" ")}</p>
          )}
        </Fragment>
      ))}
    </div>
  );
}
