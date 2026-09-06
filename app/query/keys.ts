// react-query cache keys. Ported from the old packages/frontend/src/api/queries.ts.
//
// Keys use STABLE identifiers (function name, range key like "7d", requestId) —
// never an absolute Date.now() timestamp, which would change on every mount and
// bust the cache (R5.2). The app targets a single AWS account resolved at
// startup, so keys no longer carry a profile dimension.
//
// Client-safe: no .server imports, no AWS SDK.

import type { TimeRangeKey } from "~/lib/time-range";
import type { LogsQuery } from "~/query/types";

export const queryKeys = {
  meta: ["meta"] as const,
  functions: ["functions"] as const,
  invocations: (fn: string, range: TimeRangeKey) => ["invocations", fn, range] as const,
  logs: (fn: string, requestId: string, query: LogsQuery) =>
    ["logs", fn, requestId, query] as const,
};
