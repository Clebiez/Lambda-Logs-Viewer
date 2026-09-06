// Formatting and colorization utilities, with no UI dependency.

export function formatDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

/** Time only (hh:mm:ss.mmm) — for the compact per-log-line display. */
export function formatTime(ts: number | null): string {
  if (!ts) return "-";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export type LogLevel = "lifecycle" | "level-error" | "level-warn" | "";

/** Determines the CSS class of a log line based on its nature. */
export function logLineClass(message: string): LogLevel {
  if (/^(START|END|REPORT|INIT_START)\b/.test(message)) return "lifecycle";
  if (/\b(ERROR|Error|Exception|Traceback|FATAL)\b/.test(message)) return "level-error";
  if (/\b(WARN|WARNING)\b/.test(message)) return "level-warn";
  return "";
}
