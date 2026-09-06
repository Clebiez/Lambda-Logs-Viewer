// URL state for the logs page, co-located with the route. This hook is the ONLY
// place that touches the router (useSearchParams, useParams) for this page: the
// route component and its presentational children stay router-free and receive
// plain data + callbacks.
//
// It derives the function name, requestId and the breadcrumb targets from the
// URL, and builds the memoized LogsQuery that mirrors the URL bounds.

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import type { Crumb } from "~/components/shared/RouteBreadcrumbs";
import type { LogsQuery } from "~/query/types";

export interface LogsPageState {
  /** Function name from the route param (":name"). */
  readonly name: string | undefined;
  /** Invocation requestId from the route param (":requestId"). */
  readonly requestId: string | undefined;
  /** Query mirroring the URL bounds. */
  readonly query: LogsQuery;
  /** Breadcrumb targets (Functions + function links). */
  readonly crumbs: Crumb[];
}

/** Encapsulates all URL derivation for the logs page. */
export function useLogsPageState(): LogsPageState {
  const { name, requestId } = useParams<{ name: string; requestId: string }>();
  const [searchParams] = useSearchParams();

  const query = useMemo<LogsQuery>(() => {
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const logStream = searchParams.get("logStream");
    return {
      logStream: logStream ?? null,
      startTime: startTime ? Number(startTime) : null,
      endTime: endTime ? Number(endTime) : null,
    };
  }, [searchParams]);

  const crumbs: Crumb[] = [
    { label: "Functions", to: { pathname: "/" } },
    {
      label: name ?? "",
      to: { pathname: `/functions/${encodeURIComponent(name ?? "")}` },
    },
    { label: `${requestId?.slice(0, 8)}…` },
  ];

  return {
    name,
    requestId,
    query,
    crumbs,
  };
}
