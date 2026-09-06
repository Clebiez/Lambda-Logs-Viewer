// Lambda log parsing logic. Pure and deterministic: this is the testable
// business core, independent of CloudWatch.
//
// A Lambda invocation is delimited in CloudWatch by lines
// "START RequestId: ...", "END RequestId: ..." and "REPORT RequestId: ...".

import type { Invocation } from "./entities";

/** Metrics extracted from a REPORT line. */
export interface ReportMetrics {
  readonly durationMs: number | null;
  readonly billedDurationMs: number | null;
  readonly memorySizeMb: number | null;
  readonly maxMemoryUsedMb: number | null;
  /** Cold-start initialization time, present only on a cold invocation. */
  readonly initDurationMs: number | null;
}

type LifecycleType = "START" | "END" | "REPORT";

/**
 * Indicates whether a log line denotes an invocation failure.
 * Covers Lambda timeouts, runtime error markers and common exceptions.
 * Intentionally conservative to avoid false positives (it does not match a
 * plain "error" in the middle of a sentence).
 */
export function isErrorLine(message: string): boolean {
  return (
    /Task timed out after/i.test(message) ||
    /\[ERROR\]/.test(message) ||
    /\bERROR\b/.test(message) ||
    /"errorMessage"\s*:/.test(message) ||
    /\b(Unhandled|Uncaught)\b/i.test(message) ||
    /\b(Exception|Traceback|FATAL)\b/.test(message) ||
    // Named exceptions: "TypeError:", "ReferenceError:", "Runtime.ImportModuleError"…
    /\b[A-Z][A-Za-z]*Error\b/.test(message)
  );
}

/** Extracts a RequestId from any line (often present as a prefix). */
export function extractRequestId(message: string): string | null {
  const m = message.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return m?.[1] ?? null;
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Removes the redundant leading fields the Lambda runtime prepends to structured
 * log lines: the ISO timestamp and the invocation RequestId, both tab-separated
 * (e.g. "2026-09-08T18:51:40.142Z\t<uuid>\tDEBUG …"). The console already shows
 * the timestamp in its own column and the RequestId is the selected invocation,
 * so stripping them leaves just the meaningful message (e.g. "DEBUG …").
 *
 * Conservative: it only strips a field when it is exactly a leading ISO
 * timestamp / UUID followed by a tab (or whitespace). Lifecycle lines
 * (START/END/REPORT) and free-form lines without this prefix are left untouched.
 */
export function stripLogPrefix(message: string): string {
  let rest = message;

  // Leading ISO timestamp + separator.
  const tsMatch = rest.match(ISO_TIMESTAMP);
  if (tsMatch) {
    const after = rest.slice(tsMatch[0].length);
    if (/^[\t ]/.test(after)) rest = after.replace(/^[\t ]+/, "");
  }

  // Leading RequestId (UUID) + separator.
  const idMatch = rest.match(UUID);
  if (idMatch) {
    const after = rest.slice(idMatch[0].length);
    if (/^[\t ]/.test(after)) rest = after.replace(/^[\t ]+/, "");
  }

  return rest;
}

export interface ParsedLifecycleLine {
  readonly type: LifecycleType;
  readonly requestId: string;
  readonly report?: ReportMetrics;
}

/** A raw log event (independent of the AWS SDK). */
export interface RawLogEvent {
  readonly timestamp: number;
  readonly message: string;
  readonly logStreamName?: string | null;
}

/**
 * Parses a Lambda lifecycle line (START/END/REPORT).
 * Returns null if the line is not a lifecycle marker.
 */
export function parseLifecycleLine(message: string | undefined): ParsedLifecycleLine | null {
  if (!message) return null;

  const startMatch = message.match(/^START RequestId:\s*([0-9a-f-]+)/i);
  if (startMatch?.[1]) return { type: "START", requestId: startMatch[1] };

  const endMatch = message.match(/^END RequestId:\s*([0-9a-f-]+)/i);
  if (endMatch?.[1]) return { type: "END", requestId: endMatch[1] };

  const reportMatch = message.match(/^REPORT RequestId:\s*([0-9a-f-]+)/i);
  if (reportMatch?.[1]) {
    return { type: "REPORT", requestId: reportMatch[1], report: parseReport(message) };
  }

  return null;
}

/**
 * Extracts metrics from a REPORT line.
 * Ex: "REPORT RequestId: xxx Duration: 12.34 ms Billed Duration: 13 ms
 *      Memory Size: 128 MB Max Memory Used: 75 MB"
 */
export function parseReport(message: string): ReportMetrics {
  const num = (re: RegExp): number | null => {
    const m = message.match(re);
    return m?.[1] ? Number(m[1]) : null;
  };
  return {
    // "Duration:" also matches "Billed Duration:" / "Init Duration:", so anchor
    // it on a word boundary to capture the plain Duration field only.
    durationMs: num(/(?:^|\s)Duration:\s*([\d.]+)\s*ms/),
    billedDurationMs: num(/Billed Duration:\s*([\d.]+)\s*ms/),
    memorySizeMb: num(/Memory Size:\s*([\d.]+)\s*MB/),
    maxMemoryUsedMb: num(/Max Memory Used:\s*([\d.]+)\s*MB/),
    initDurationMs: num(/Init Duration:\s*([\d.]+)\s*ms/),
  };
}

/**
 * Parses a REPORT line into its metrics, or returns null if the message is not a
 * REPORT line. Used by the log console to render REPORT lines as a metrics card
 * instead of raw text.
 */
export function parseReportLine(message: string): ReportMetrics | null {
  const parsed = parseLifecycleLine(message);
  return parsed?.type === "REPORT" ? (parsed.report ?? null) : null;
}

/**
 * Reconstructs invocations from a stream of lifecycle events, grouping by
 * RequestId. Sorts from most recent to oldest.
 * The scope is determined by the time window of the provided events, not by a
 * max number of invocations.
 */
export function buildInvocations(events: readonly RawLogEvent[]): Invocation[] {
  // Local mutable state, converted to immutable entities at the end.
  interface Draft {
    requestId: string;
    logStreamName: string | null;
    startTime: number | null;
    endTime: number | null;
    durationMs: number | null;
    billedDurationMs: number | null;
    memorySizeMb: number | null;
    maxMemoryUsedMb: number | null;
    status: Invocation["status"];
  }

  const drafts = new Map<string, Draft>();

  const ensureDraft = (requestId: string, logStreamName: string | null): Draft => {
    let draft = drafts.get(requestId);
    if (!draft) {
      draft = {
        requestId,
        logStreamName,
        startTime: null,
        endTime: null,
        durationMs: null,
        billedDurationMs: null,
        memorySizeMb: null,
        maxMemoryUsedMb: null,
        status: "unknown",
      };
      drafts.set(requestId, draft);
    }
    return draft;
  };

  for (const event of events) {
    const parsed = parseLifecycleLine(event.message);

    if (parsed) {
      const draft = ensureDraft(parsed.requestId, event.logStreamName ?? null);
      if (parsed.type === "START") {
        draft.startTime = event.timestamp;
      } else if (parsed.type === "END") {
        draft.endTime = event.timestamp;
      } else if (parsed.type === "REPORT" && parsed.report) {
        draft.durationMs = parsed.report.durationMs;
        draft.billedDurationMs = parsed.report.billedDurationMs;
        draft.memorySizeMb = parsed.report.memorySizeMb;
        draft.maxMemoryUsedMb = parsed.report.maxMemoryUsedMb;
        // An invocation with a REPORT is complete: success, unless an error
        // was already detected (the error takes precedence).
        if (draft.status !== "error") draft.status = "success";
      }
      continue;
    }

    // Non-lifecycle line: if it's an error, attach it to its RequestId.
    if (isErrorLine(event.message)) {
      const requestId = extractRequestId(event.message);
      if (requestId) {
        const draft = ensureDraft(requestId, event.logStreamName ?? null);
        draft.status = "error";
      }
    }
  }

  return [...drafts.values()]
    .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
    .map((d) => ({ ...d }));
}

/**
 * Filters/sorts an invocation's log lines. Keeps only the lines containing the
 * RequestId; if none match, returns everything, sorted by ascending timestamp.
 */
export function selectInvocationLogs(
  events: readonly RawLogEvent[],
  requestId: string,
): RawLogEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const matching = sorted.filter((e) => e.message.includes(requestId));
  return matching.length > 0 ? matching : sorted;
}
