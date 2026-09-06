// Application layer: invocations use case. Reconstructs a function's invocations
// from the logs, over an optional time window. Depends on injected Deps.

import type { Invocation } from "~/domain/entities";
import { buildInvocations } from "~/domain/log-parsing";
import type { Deps } from "./container.server";

/** Optional time window (ms epoch bounds) scoping the invocation search. */
export interface ListInvocationsOptions {
  readonly startTime?: number;
  readonly endTime?: number;
}

/** Reconstructs a function's invocations from the logs, over a time period. */
export async function listInvocations(
  deps: Deps,
  functionName: string,
  options: ListInvocationsOptions = {},
): Promise<Invocation[]> {
  const events = await deps.logs.fetchInvocationReconstructionEvents(functionName, {
    ...(options.startTime !== undefined ? { startTime: options.startTime } : {}),
    ...(options.endTime !== undefined ? { endTime: options.endTime } : {}),
  });
  return buildInvocations(events);
}
