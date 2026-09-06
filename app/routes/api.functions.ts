// Resource route (JSON): lists functions for the resolved profile. Thin loader
// that mirrors the old `GET /api/functions` shape ({ region, count, functions })
// so the client-side react-query hooks (task 6) can fetch it. All work is done
// by the same services used by the page loaders.

import { data } from "react-router";
import { demo, isDemoMode } from "~/lib/demo.server";
import { mapError } from "~/lib/error-mapping";
import { logServerError } from "~/lib/log.server";
import { listFunctions } from "~/services/functions.server";
import { resolveScope } from "~/services/profile-resolution.server";

export async function loader() {
  if (isDemoMode()) return demo.functions();
  try {
    const { deps } = await resolveScope();
    const functions = await listFunctions(deps);
    return { region: deps.region, count: functions.length, functions };
  } catch (err) {
    logServerError("GET /api/functions", err);
    const mapped = mapError(err);
    return data(mapped, { status: mapped.status });
  }
}
