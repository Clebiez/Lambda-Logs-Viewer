// Application layer: functions use case. Orchestrates the FunctionProvider and
// the domain, without knowing about AWS or HTTP. Depends on injected Deps, so
// it is unit-testable with a fake provider.

import type { LambdaFunction } from "~/domain/entities";
import type { Deps } from "./container.server";

/** Lists and sorts the Lambda functions by name. */
export async function listFunctions(deps: Deps): Promise<LambdaFunction[]> {
  const functions = await deps.functions.listFunctions();
  return [...functions].sort((a, b) => a.name.localeCompare(b.name));
}
