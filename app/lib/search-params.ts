// Typed access to the URL search params that hold all view state (R4). The URL
// is the single source of truth: time range, status filter and the function
// search live here, read by loaders (server) and the UI alike.

import type { InvocationStatus } from "~/domain/entities";
import { DEFAULT_RANGE, type TimeRangeKey, isTimeRangeKey } from "~/lib/time-range";

/** Canonical param names. Keep these in one place to avoid typos across layers. */
const PARAM = {
  range: "range",
  status: "status",
  q: "q",
} as const;

/** Status filter values: all invocations, or a single reconstructed status. */
export type StatusFilter = "all" | InvocationStatus;

const STATUS_FILTERS: readonly StatusFilter[] = ["all", "success", "error", "unknown"];

const DEFAULT_STATUS: StatusFilter = "all";

/** Anything indexable by string, so this works with both URLSearchParams. */
type ParamSource = Pick<URLSearchParams, "get">;

/** Time range key; falls back to the default when missing or invalid. */
export function getRange(params: ParamSource): TimeRangeKey {
  const value = params.get(PARAM.range);
  return isTimeRangeKey(value) ? value : DEFAULT_RANGE;
}

/** Status filter; falls back to "all" when missing or invalid. */
export function getStatus(params: ParamSource): StatusFilter {
  const value = params.get(PARAM.status);
  return isStatusFilter(value) ? value : DEFAULT_STATUS;
}

/** Function search text; empty string when absent. */
function getSearch(params: ParamSource): string {
  return params.get(PARAM.q) ?? "";
}

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && (STATUS_FILTERS as readonly string[]).includes(value);
}

/**
 * Returns a new URLSearchParams with the given patch applied. A null value
 * removes the param (so defaults keep the URL clean). Does not mutate the input.
 */
function withParams(
  params: URLSearchParams,
  patch: Partial<Record<keyof typeof PARAM, string | null>>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    const name = PARAM[key as keyof typeof PARAM];
    if (value === null || value === undefined) next.delete(name);
    else next.set(name, value);
  }
  return next;
}
