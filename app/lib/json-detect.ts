// Detection and extraction of JSON within a log line.
// Lambda logs often prefix the JSON (timestamp, level, RequestId…),
// e.g. '2024-... INFO {"user":"x"}'. We isolate the first balanced { … } or
// [ … ] portion and try to parse it.

export interface JsonInLine {
  /** Text before the JSON (log prefix). */
  readonly prefix: string;
  /** Parsed JSON value. */
  readonly value: unknown;
  /** Raw JSON text (as extracted). */
  readonly raw: string;
}

/**
 * Looks for the first balanced JSON substring ({...} or [...]) and parses it.
 * Returns null if the line does not contain valid JSON.
 */
export function extractJson(message: string): JsonInLine | null {
  const start = firstJsonStart(message);
  if (start === -1) return null;

  const open = message[start];
  if (open !== "{" && open !== "[") return null;
  const close = open === "{" ? "}" : "]";
  const end = matchingCloseIndex(message, start, open, close);
  if (end === -1) return null;

  const raw = message.slice(start, end + 1);
  try {
    const value = JSON.parse(raw);
    // We only show the viewer for objects/arrays, not scalars.
    if (value === null || typeof value !== "object") return null;
    return { prefix: message.slice(0, start), value, raw };
  } catch {
    return null;
  }
}

/** Index of the first '{' or '[' in the line (-1 if none). */
function firstJsonStart(message: string): number {
  const brace = message.indexOf("{");
  const bracket = message.indexOf("[");
  if (brace === -1) return bracket;
  if (bracket === -1) return brace;
  return Math.min(brace, bracket);
}

/**
 * Finds the index of the balanced closing character, ignoring braces located
 * inside JSON strings (quotes, with escaping).
 */
function matchingCloseIndex(s: string, start: number, open: string, close: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}
