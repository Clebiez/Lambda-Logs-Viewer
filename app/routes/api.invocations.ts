// Resource route (JSON): reconstructs a function's invocations. Thin loader
// mirroring the old `GET /api/functions/:name/invocations` shape
// ({ function, count, invocations }). Accepts optional startTime/endTime query
// bounds (ms epoch), like the old server. Serves react-query refetch (task 6).

import { data } from "react-router";
import { demo, isDemoMode } from "~/lib/demo.server";
import { mapError } from "~/lib/error-mapping";
import { logServerError } from "~/lib/log.server";
import { listInvocations } from "~/services/invocations.server";
import { resolveScope } from "~/services/profile-resolution.server";
import type { Route } from "./+types/api.invocations";

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const name = params.name;
  if (isDemoMode()) return demo.invocations(name);
  const search = new URL(request.url).searchParams;
  const startTime = parseNumber(search.get("startTime"));
  const endTime = parseNumber(search.get("endTime"));
  try {
    const { deps } = await resolveScope();
    const invocations = await listInvocations(deps, name, {
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
    });
    return { function: name, count: invocations.length, invocations };
  } catch (err) {
    logServerError(`GET /api/functions/${name}/invocations`, err);
    const mapped = mapError(err);
    return data(mapped, { status: mapped.status });
  }
}
