// TanStack Query hooks. The cache is managed here: the function and invocation
// lists stay cached to avoid re-scraping AWS on every navigation (R5.1).
//
// The app now targets a SINGLE AWS account, resolved once at startup from the
// environment (AWS_PROFILE or the shell's credentials). There is no more
// ?profile= URL state, no ProfileContext and no localStorage: every query is
// implicitly scoped to that one account, so the hooks no longer read or pass a
// profile.
//
// The shared browser QueryClient (app/query/client-instance.ts) carries baseline
// staleTime/gcTime defaults (2 min / 1h); each hook below overrides them with the
// per-data-type SWR policy (functions 120s, invocations 30s, logs 300s, meta
// Infinity). The invocations list supports opt-in auto-refresh via
// refetchInterval; logs are never polled (a finished invocation is immutable).
//
// Client-safe: plain fetch via ~/query/client, no .server imports, no AWS SDK.

import { useQuery } from "@tanstack/react-query";
import { type TimeRangeKey, rangeStartTime } from "~/lib/time-range";
import { api } from "~/query/client";
import { queryKeys } from "~/query/keys";
import type { LogsQuery } from "~/query/types";

/** Auto-refresh poll interval (ms) for the invocations list. */
const AUTO_REFRESH_MS = 10_000;

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: api.getMeta,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
  });
}

export function useFunctions() {
  return useQuery({
    queryKey: queryKeys.functions,
    queryFn: api.listFunctions,
    staleTime: 120_000,
    gcTime: 3_600_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useInvocations(
  functionName: string | undefined,
  rangeKey: TimeRangeKey,
  autoRefresh: boolean,
) {
  return useQuery({
    // Keyed by the range KEY (stable), not the computed timestamp.
    queryKey: queryKeys.invocations(functionName ?? "", rangeKey),
    // startTime is computed at fetch time, not baked into the key.
    queryFn: () =>
      api.listInvocations(functionName as string, { startTime: rangeStartTime(rangeKey) }),
    enabled: Boolean(functionName),
    staleTime: 30_000,
    gcTime: 3_600_000,
    refetchOnWindowFocus: false,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
    // Auto-refresh forces a fresh fetch on mount; idle revalidates only if stale.
    refetchOnMount: autoRefresh ? "always" : true,
  });
}

export function useInvocationLogs(
  functionName: string | undefined,
  requestId: string | undefined,
  query: LogsQuery,
) {
  return useQuery({
    queryKey: queryKeys.logs(functionName ?? "", requestId ?? "", query),
    queryFn: () => api.getInvocationLogs(functionName as string, requestId as string, query),
    enabled: Boolean(functionName && requestId),
    staleTime: 300_000,
    gcTime: 3_600_000,
    refetchOnWindowFocus: false,
    // A finished invocation's logs are immutable, so no polling: the cached
    // window is served on revisit.
    refetchOnMount: false,
  });
}
