// Ported verbatim from the old frontend. Client-safe: pure rendering, no I/O.

interface HighlightProps {
  text: string;
  term: string;
}

/** Highlights (via <mark>) the portion of `text` matching `term`. */
export function Highlight({ text, term }: HighlightProps) {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(trimmed);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + trimmed.length)}</mark>
      {text.slice(idx + trimmed.length)}
    </>
  );
}

/**
 * Highlights ALL occurrences of `term` in `text` (case-insensitive). Used for
 * log search, where a line can contain several matches. Returns the plain text
 * when the term is empty or absent.
 */
export function HighlightAll({ text, term }: HighlightProps) {
  const trimmed = term.trim();
  if (!trimmed) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerTerm = trimmed.toLowerCase();

  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lowerText.indexOf(lowerTerm, from);
  if (idx === -1) return <>{text}</>;

  let key = 0;
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(<mark key={key++}>{text.slice(idx, idx + lowerTerm.length)}</mark>);
    from = idx + lowerTerm.length;
    idx = lowerText.indexOf(lowerTerm, from);
  }
  if (from < text.length) parts.push(text.slice(from));

  return <>{parts}</>;
}
