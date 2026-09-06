// Resource route (JSON): metadata for the resolved profile. Thin loader
// mirroring the old `GET /api/meta` shape ({ profile, region, identity }).
// STS failures don't block the response: identity falls back to a mapped error
// shape while profile/region are still returned (old behavior). Serves the
// header's resolved-account display (tasks 6-7).

import { data } from "react-router";
import { demo, isDemoMode } from "~/lib/demo.server";
import { mapError } from "~/lib/error-mapping";
import { logServerError } from "~/lib/log.server";
import { getCallerIdentity } from "~/services/identity.server";
import { resolveScope } from "~/services/profile-resolution.server";

export async function loader() {
  if (isDemoMode()) return demo.meta();
  try {
    const { profile, deps } = await resolveScope();
    let identity: unknown;
    try {
      identity = await getCallerIdentity(deps);
    } catch (err) {
      // Don't block the UI if STS fails — surface a readable error for identity.
      logServerError("GET /api/meta (STS getCallerIdentity)", err);
      identity = mapError(err);
    }
    return { profile, region: deps.region, identity };
  } catch (err) {
    logServerError("GET /api/meta", err);
    const mapped = mapError(err);
    return data(mapped, { status: mapped.status });
  }
}
