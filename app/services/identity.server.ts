// Application layer: identity use case. Resolves the current AWS identity
// (account, ARN) from the active profile. Depends on injected Deps.

import type { CallerIdentity } from "~/domain/entities";
import type { Deps } from "./container.server";

/** Resolves the current AWS identity (account, ARN) from the active profile. */
export async function getCallerIdentity(deps: Deps): Promise<CallerIdentity> {
  const { accountId, arn } = await deps.identity.getCallerIdentity();
  return { accountId, arn };
}
