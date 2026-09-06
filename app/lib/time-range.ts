// Predefined time ranges to filter invocations.

export type TimeRangeKey = "1h" | "24h" | "7d" | "30d";

interface TimeRangeDef {
  readonly label: string;
  readonly durationMs: number; // required bound: max 30 days
}

// Bounded ranges: CloudWatch de facto imposes a practical limit, and we don't
// want to scan all logs (cost/quota). 30 days is the max.
const TIME_RANGES: Record<TimeRangeKey, TimeRangeDef> = {
  "1h": { label: "Last hour", durationMs: 60 * 60 * 1000 },
  "24h": { label: "24 hours", durationMs: 24 * 60 * 60 * 1000 },
  "7d": { label: "7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "30 days", durationMs: 30 * 24 * 60 * 60 * 1000 },
};

export const DEFAULT_RANGE: TimeRangeKey = "24h";

export function isTimeRangeKey(v: string | null): v is TimeRangeKey {
  return v !== null && v in TIME_RANGES;
}

/** Computes the startTime bound (ms epoch) for a range. */
export function rangeStartTime(key: TimeRangeKey, now: number = Date.now()): number {
  return now - TIME_RANGES[key].durationMs;
}

export function timeRangeOptions(): { value: TimeRangeKey; label: string }[] {
  return (Object.keys(TIME_RANGES) as TimeRangeKey[]).map((value) => ({
    value,
    label: TIME_RANGES[value].label,
  }));
}
