// URL state + navigation for the invocations page, co-located with the route.
// This hook is the ONLY place that touches the router (useSearchParams,
// useNavigate, useParams) for this page: the route component and its
// presentational children stay router-free and receive plain data + callbacks.
//
// All view state lives in the URL (R4.2): the status filter (?status=), the
// time range (?range=) and auto-refresh (?auto=1) are derived here, and every
// mutation goes through `update(patch)` which preserves the rest of the query
// string. Selecting an invocation builds the per-invocation scope
// (logStream/startTime/endTime) and navigates to its logs page.

import { useParams, useSearchParams } from "react-router";
import type { Crumb } from "~/components/shared/RouteBreadcrumbs";
import type { Invocation } from "~/domain/entities";
import { type StatusFilter, getRange, getStatus } from "~/lib/search-params";
import type { TimeRangeKey } from "~/lib/time-range";

/** The invocation scope currently selected in the split view (from the URL). */
interface SelectedInvocation {
  readonly requestId: string;
  readonly logStream: string | null;
  readonly startTime: number | null;
  readonly endTime: number | null;
}

export interface InvocationsPageState {
  /** Function name from the route param (":name"). */
  readonly functionName: string;
  /** Status filter derived from ?status= (defaults to "all"). */
  readonly statusFilter: StatusFilter;
  /** Time range derived from ?range= (defaults to the app default). */
  readonly rangeKey: TimeRangeKey;
  /** Auto-refresh flag derived from ?auto=1. */
  readonly autoRefresh: boolean;
  /** Breadcrumb targets (Functions link carries the active profile). */
  readonly breadcrumbs: Crumb[];
  /** The invocation currently selected for the logs panel, or null. */
  readonly selected: SelectedInvocation | null;
  /** Patch the URL search params, preserving the rest. null removes a param. */
  update(patch: Record<string, string | null>): void;
  /** Select an invocation to show its logs in the right panel (no navigation). */
  selectInvocation(inv: Invocation): void;
  /** Clear the current logs-panel selection. */
  clearSelection(): void;
}

/** Encapsulates all URL derivation + navigation for the invocations page. */
export function useInvocationsPageState(): InvocationsPageState {
  const { name } = useParams<{ name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const functionName = name ?? "";

  // All view state comes from the URL (R4.2). The status filter and time range
  // are typed getters; auto-refresh uses ?auto=1.
  const statusFilter = getStatus(searchParams);
  const rangeKey = getRange(searchParams);
  const autoRefresh = searchParams.get("auto") === "1";

  // Patch the URL search params, preserving the rest (profile, etc.). A null
  // value removes the param so defaults keep the URL clean (R4.2).
  const update = (patch: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  // The selected invocation lives in the URL (?requestId + its scope), so the
  // split-view selection is shareable and survives reloads — without changing
  // route. Selection updates use replace so the back button isn't polluted.
  const requestId = searchParams.get("requestId");
  const selected: SelectedInvocation | null = requestId
    ? {
        requestId,
        logStream: searchParams.get("logStream"),
        startTime: parseNum(searchParams.get("startTime")),
        endTime: parseNum(searchParams.get("endTime")),
      }
    : null;

  const selectInvocation = (inv: Invocation) => {
    update({
      requestId: inv.requestId,
      logStream: inv.logStreamName ?? null,
      startTime: inv.startTime ? String(inv.startTime) : null,
      endTime: inv.endTime ? String(inv.endTime) : null,
    });
  };

  const clearSelection = () => {
    update({ requestId: null, logStream: null, startTime: null, endTime: null });
  };

  const breadcrumbs: Crumb[] = [
    { label: "Functions", to: { pathname: "/" } },
    { label: functionName },
  ];

  return {
    functionName,
    statusFilter,
    rangeKey,
    autoRefresh,
    breadcrumbs,
    selected,
    update,
    selectInvocation,
    clearSelection,
  };
}

function parseNum(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
