// Invocations page route ("/functions/:name"): reconstructs and lists a
// function's recent invocations.
//
// Loading follows the thin-loader + clientLoader + SWR model (R1, R2, R3): the
// server `loader` runs only on the first document load and returns just the
// URL-derived scope (profile, function name, range, status) — no AWS work, no
// `.server` imports (R2.1-R2.4, R7.1, R7.2, R10.5). After hydration the
// `clientLoader` serves from / defers to the shared TanStack Query cache via the
// `ensure` bridge using the SAME key + queryFn as `useInvocations` (R1.1, R1.2,
// R3.1). `clientLoader.hydrate` + `HydrateFallback` give a clean first paint
// (R3.4, R3.5).
//
// The component is orchestration only: it derives view state + navigation from
// `useInvocationsPageState()` (which owns the router), reads live data from
// `useInvocations`, and passes plain data + callbacks down to presentational
// components (RouteBreadcrumbs, InvocationToolbar, InvocationTable). Those
// children never touch the router or URL. Full parity with the old page is
// preserved: real status detection with colored rows (R6.2), a client-side
// status filter (?status=, R4.2), a time-range selector (?range=, R6.2) and an
// auto-refresh toggle (?auto=1) driving react-query's poll interval (R9). It
// reads the initial envelope from `useLoaderData` and live data from
// `useInvocations` (R1.4, R1.5).

import { ActionIcon, Box, Group, Paper, ScrollArea, Skeleton, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useLoaderData } from "react-router";
import { InvocationTable } from "~/components/invocations/InvocationTable";
import { InvocationToolbar } from "~/components/invocations/InvocationToolbar";
import { LogsPanel } from "~/components/logs/LogsPanel";
import { QueryState } from "~/components/shared/QueryState";
import { RouteBreadcrumbs } from "~/components/shared/RouteBreadcrumbs";
import type { Invocation } from "~/domain/entities";
import { getRange } from "~/lib/search-params";
import { rangeStartTime, timeRangeOptions } from "~/lib/time-range";
import { api } from "~/query/client";
import { ensure } from "~/query/client-loader";
import { useInvocations } from "~/query/hooks";
import { queryKeys } from "~/query/keys";
import type { InvocationsResponse } from "~/query/types";
import type { Route } from "./+types/invocations";
import { useInvocationsPageState } from "./invocations.state";

// clientLoader: after hydration, serve from / warm the shared query cache using
// the SAME key + queryFn as useInvocations. Keyed by the stable range KEY; the
// startTime is computed inside the queryFn (never baked into the key) so the
// entry survives across mounts (R3.1, R8.2).
export async function clientLoader({
  request,
  params,
}: Route.ClientLoaderArgs): Promise<InvocationsResponse> {
  const search = new URL(request.url).searchParams;
  const range = getRange(search);
  const functionName = params.name;
  try {
    return await ensure(
      queryKeys.invocations(functionName, range),
      () => api.listInvocations(functionName, { startTime: rangeStartTime(range) }),
      30_000,
    );
  } catch {
    // Priming the cache failed (e.g. AWS/network error). Don't throw — that would
    // crash the whole route into React Router's "Application Error" page. Return
    // an empty envelope so the component still mounts; the useInvocations hook
    // then re-fetches, exposing the error through QueryState (which renders the
    // refined ErrorState) instead of a blank screen.
    return { function: functionName, count: 0, invocations: [] };
  }
}
clientLoader.hydrate = true as const;

/** First-paint skeleton that mimics the toolbar + table rather than a spinner. */
export function HydrateFallback() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          <Skeleton height={30} width={220} radius="sm" />
          <Skeleton height={30} width={150} radius="sm" />
        </Group>
        <Skeleton height={30} width={130} radius="sm" />
      </Group>
      <Stack gap={4}>
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
          <Skeleton key={i} height={36} radius="sm" />
        ))}
      </Stack>
    </Stack>
  );
}

export default function Invocations() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const {
    functionName,
    statusFilter,
    rangeKey,
    autoRefresh,
    breadcrumbs,
    selected,
    update,
    selectInvocation,
    clearSelection,
  } = useInvocationsPageState();

  const query = useInvocations(functionName, rangeKey, autoRefresh);

  // Prefer cached data from the hook; fall back to the clientLoader envelope for
  // the first render. Both are the full, UNFILTERED list — the ?status filter is
  // applied client-side below (R1.4, R1.5).
  const invocations: Invocation[] = query.data?.invocations ?? loaderData.invocations;
  const hasData = invocations.length > 0 || query.data != null;

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? invocations
        : invocations.filter((inv) => inv.status === statusFilter),
    [invocations, statusFilter],
  );

  const counts = useMemo(() => {
    let success = 0;
    let error = 0;
    for (const inv of invocations) {
      if (inv.status === "success") success++;
      else if (inv.status === "error") error++;
    }
    return { all: invocations.length, success, error };
  }, [invocations]);

  const hasSelection = selected != null;

  const invocationsPane = (
    <QueryState
      isLoading={query.isLoading}
      error={query.error}
      isFetching={query.isFetching}
      hasData={hasData}
      onRetry={() => void query.refetch()}
    >
      {filtered.length === 0 ? (
        <Paper p="xl" withBorder ta="center" c="dimmed">
          {invocations.length === 0
            ? "No invocation found for this period. The Lambda may not have been invoked, or its logs have expired."
            : "No invocation matches this filter."}
        </Paper>
      ) : (
        <ScrollArea.Autosize mah="calc(100vh - 190px)" type="hover">
          <InvocationTable
            invocations={filtered}
            onSelect={selectInvocation}
            selectedRequestId={selected?.requestId ?? null}
            compact={hasSelection}
          />
        </ScrollArea.Autosize>
      )}
    </QueryState>
  );

  return (
    <Stack gap="md" h="calc(100vh - 88px)">
      <RouteBreadcrumbs crumbs={breadcrumbs} />

      <InvocationToolbar
        statusFilter={statusFilter}
        counts={counts}
        rangeKey={rangeKey}
        rangeOptions={timeRangeOptions()}
        autoRefresh={autoRefresh}
        isFetching={query.isFetching}
        onStatusChange={(v) => update({ status: v === "all" ? null : v })}
        onRangeChange={(v) => update({ range: v })}
        onAutoRefreshChange={(checked) => update({ auto: checked ? "1" : null })}
      />

      {hasSelection ? (
        <Box className="split-view" style={{ flex: 1, minHeight: 0 }}>
          <Box className="split-view__left">{invocationsPane}</Box>
          <Box className="split-view__right">
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Text size="sm" c="dimmed" ff="monospace" truncate="end">
                {selected.requestId}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={clearSelection}
                aria-label="Close logs panel"
              >
                ×
              </ActionIcon>
            </Group>
            <LogsPanel
              functionName={functionName}
              requestId={selected.requestId}
              logStream={selected.logStream}
              startTime={selected.startTime}
              endTime={selected.endTime}
            />
          </Box>
        </Box>
      ) : (
        <Box style={{ flex: 1, minHeight: 0 }}>{invocationsPane}</Box>
      )}
    </Stack>
  );
}
