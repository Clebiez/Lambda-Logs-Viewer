// Resource route (JSON): fetches the log lines of a specific invocation. Thin
// loader mirroring the old `GET /api/functions/:name/invocations/:requestId/logs`
// shape ({ function, requestId, count, logs }). Accepts optional
// startTime/endTime/logStream query bounds. Serves react-query refetch (task 6).

import { data } from "react-router";
import type { LogQuery } from "~/domain/ports";
import { demo, isDemoMode } from "~/lib/demo.server";
import { mapError } from "~/lib/error-mapping";
import { logServerError } from "~/lib/log.server";
import { getInvocationLogs } from "~/services/logs.server";
import { resolveScope } from "~/services/profile-resolution.server";
import type { Route } from "./+types/api.logs";

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const name = params.name;
  const requestId = params.requestId;
  if (isDemoMode()) return demo.logs(name, requestId);
  const search = new URL(request.url).searchParams;
  const startTime = parseNumber(search.get("startTime"));
  const endTime = parseNumber(search.get("endTime"));
  const logStreamName = search.get("logStream") ?? undefined;
  const query: LogQuery = {
    ...(startTime !== undefined ? { startTime } : {}),
    ...(endTime !== undefined ? { endTime } : {}),
    ...(logStreamName ? { logStreamName } : {}),
  };
  try {
    const { deps } = await resolveScope();
    const logs = await getInvocationLogs(deps, name, requestId, query);
    return { function: name, requestId, count: logs.length, logs };
  } catch (err) {
    logServerError(`GET /api/functions/${name}/invocations/${requestId}/logs`, err);
    const mapped = mapError(err);
    return data(mapped, { status: mapped.status });
  }
}
