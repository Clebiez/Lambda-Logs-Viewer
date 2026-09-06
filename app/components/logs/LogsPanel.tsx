// Self-contained logs panel: given a selected invocation (requestId + its log
// scope), it fetches and renders that invocation's logs with the toolbar and
// console. It is the right-hand side of the invocations split view, and is also
// reused by the standalone logs route.
//
// It owns the search + level-filter UI state and reads data via
// useInvocationLogs. The heavy console is delegated to LogConsole; error /
// loading / empty states go through QueryState + ErrorState.

import { Paper, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { LogConsole } from "~/components/logs/LogConsole";
import { type LogLevelFilter, LogsToolbar } from "~/components/logs/LogsToolbar";
import { ReportLine } from "~/components/logs/ReportLine";
import { QueryState } from "~/components/shared/QueryState";
import type { LogLine as LogLineEntity } from "~/domain/entities";
import { parseReportLine, stripLogPrefix } from "~/domain/log-parsing";
import { formatDate, logLineClass } from "~/lib/format";
import { useInvocationLogs } from "~/query/hooks";
import type { LogsQuery } from "~/query/types";

interface LogsPanelProps {
  readonly functionName: string;
  readonly requestId: string;
  readonly logStream: string | null;
  readonly startTime: number | null;
  readonly endTime: number | null;
}

/** Fetches and renders one invocation's logs (toolbar + console). */
export function LogsPanel({
  functionName,
  requestId,
  logStream,
  startTime,
  endTime,
}: LogsPanelProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all");

  const query = useMemo<LogsQuery>(
    () => ({ logStream, startTime, endTime }),
    [logStream, startTime, endTime],
  );

  const result = useInvocationLogs(functionName, requestId, query);
  const rawLogs: LogLineEntity[] = result.data?.logs ?? [];
  const hasData = result.data != null;

  // Pull the REPORT line out of the stream: its metrics are surfaced as a card
  // ABOVE the console (outside the dark log surface), so it must not appear as a
  // raw line inside it. The remaining lines feed the console.
  const { report, logs } = useMemo(() => {
    let report: ReturnType<typeof parseReportLine> = null;
    const rest: LogLineEntity[] = [];
    for (const line of rawLogs) {
      const metrics = parseReportLine(stripLogPrefix(line.message));
      if (metrics && !report) {
        report = metrics;
        continue; // drop the REPORT line from the console
      }
      rest.push(line);
    }
    return { report, logs: rest };
  }, [rawLogs]);

  const counts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const line of logs) {
      const cls = logLineClass(line.message);
      if (cls === "level-error") errors++;
      else if (cls === "level-warn") warnings++;
    }
    return { total: logs.length, errors, warnings };
  }, [logs]);

  // Apply the level filter, then the full-text search, to what's rendered.
  // Search matches the cleaned message (without the ISO/RequestId prefix) so it
  // lines up with what the console actually shows.
  const visibleLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((line) => {
      const clean = stripLogPrefix(line.message);
      if (levelFilter !== "all") {
        const cls = logLineClass(clean);
        if (levelFilter === "errors" && cls !== "level-error") return false;
        if (levelFilter === "warnings" && cls !== "level-warn") return false;
      }
      if (term && !clean.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [logs, levelFilter, search]);

  // Copy respects the current filter + search: you copy what you see (cleaned).
  const copyVisible = () => {
    const text = visibleLogs
      .map((l) => `${formatDate(l.timestamp)}  ${stripLogPrefix(l.message).trimEnd()}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  const isFiltering = search.trim() !== "" || levelFilter !== "all";

  return (
    <Stack gap="sm">
      <LogsToolbar
        counts={counts}
        matchCount={visibleLogs.length}
        search={search}
        levelFilter={levelFilter}
        canCopy={visibleLogs.length > 0}
        onSearchChange={setSearch}
        onLevelFilterChange={setLevelFilter}
        onCopy={copyVisible}
      />

      {report ? <ReportLine report={report} /> : null}

      <QueryState
        isLoading={result.isLoading}
        error={result.error}
        isFetching={result.isFetching}
        hasData={hasData}
        onRetry={() => void result.refetch()}
      >
        {logs.length === 0 ? (
          <Paper p="xl" withBorder ta="center" c="dimmed">
            No logs for this invocation.
          </Paper>
        ) : visibleLogs.length === 0 ? (
          <Paper p="xl" withBorder ta="center" c="dimmed">
            No line matches {search.trim() ? `“${search.trim()}”` : "this filter"}.
          </Paper>
        ) : (
          <LogConsole logs={visibleLogs} search={isFiltering ? search : undefined} />
        )}
      </QueryState>
    </Stack>
  );
}
