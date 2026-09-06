// Application layer: logs use case. Fetches the log lines of a specific
// invocation and shapes them into domain LogLine values. Depends on injected Deps.

import type { LogLine } from "~/domain/entities";
import { selectInvocationLogs } from "~/domain/log-parsing";
import type { LogQuery } from "~/domain/ports";
import type { Deps } from "./container.server";

/** Fetches the log lines of a specific invocation. */
export async function getInvocationLogs(
  deps: Deps,
  functionName: string,
  requestId: string,
  query: LogQuery,
): Promise<LogLine[]> {
  const events = await deps.logs.fetchInvocationEvents(functionName, requestId, query);
  return selectInvocationLogs(events, requestId).map((e) => ({
    timestamp: e.timestamp,
    message: e.message,
  }));
}
