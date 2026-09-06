// Standalone logs route ("/functions/:name/invocations/:requestId"): shows one
// invocation's logs at a shareable URL. The invocations page hosts the same view
// inline (split view), so this route is now a thin wrapper that primes the cache
// (clientLoader) and delegates rendering to the shared LogsPanel.
//
// clientLoader primes the BOUNDED (endTime present) query via the shared `ensure`
// bridge and `hydrate = true` runs it on first paint behind a HydrateFallback
// skeleton. LogsPanel then reads live data through useInvocationLogs.

import { Group, Skeleton, Stack } from "@mantine/core";
import { useLoaderData } from "react-router";
import { LogsPanel } from "~/components/logs/LogsPanel";
import { RouteBreadcrumbs } from "~/components/shared/RouteBreadcrumbs";
import { api } from "~/query/client";
import { ensure } from "~/query/client-loader";
import { queryKeys } from "~/query/keys";
import type { LogsQuery, LogsResponse } from "~/query/types";
import type { Route } from "./+types/logs";
import { useLogsPageState } from "./logs.state";

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * clientLoader: primes the cache for the bounded query the panel reads first.
 * Uses the SAME key + queryFn as useInvocationLogs so the entry is shared (R3.1).
 */
export async function clientLoader({
  request,
  params,
}: Route.ClientLoaderArgs): Promise<LogsResponse> {
  const search = new URL(request.url).searchParams;
  const functionName = params.name;
  const requestId = params.requestId;
  const query: LogsQuery = {
    logStream: search.get("logStream"),
    startTime: parseNumber(search.get("startTime")),
    endTime: parseNumber(search.get("endTime")),
  };
  try {
    return await ensure<LogsResponse>(
      queryKeys.logs(functionName, requestId, query),
      () => api.getInvocationLogs(functionName, requestId, query),
      300_000,
    );
  } catch {
    // Priming failed — don't throw (that crashes the route into the "Application
    // Error" page). Return an empty envelope so the component mounts; the
    // useInvocationLogs hook re-fetches and surfaces the error via QueryState.
    return { function: functionName, requestId, count: 0, logs: [] };
  }
}
clientLoader.hydrate = true as const;

/** First-paint skeleton that mimics the logs toolbar + console (R3.5). */
export function HydrateFallback() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Skeleton height={28} width={320} radius="sm" />
        <Skeleton height={28} width={160} radius="sm" />
      </Group>
      <Skeleton height="60vh" radius="md" />
    </Stack>
  );
}

export default function Logs() {
  // Read once so the standalone route participates in the same cache priming.
  useLoaderData<typeof clientLoader>();
  const { name, requestId, query, crumbs } = useLogsPageState();

  return (
    <Stack gap="md">
      <RouteBreadcrumbs crumbs={crumbs} />

      {name && requestId ? (
        <LogsPanel
          functionName={name}
          requestId={requestId}
          logStream={query.logStream ?? null}
          startTime={query.startTime ?? null}
          endTime={query.endTime ?? null}
        />
      ) : null}
    </Stack>
  );
}
