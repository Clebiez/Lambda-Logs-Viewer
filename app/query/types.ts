// Response envelope types for the resource routes (routes/api.*). These mirror
// the JSON shapes returned by the RR resource routes built in task 5, which in
// turn mirror the old Express `/api/*` responses. The domain entity shapes
// (LambdaFunction, Invocation, LogLine, CallerIdentity) are reused from
// ~/domain/entities instead of being duplicated here.

import type { CallerIdentity, Invocation, LambdaFunction, LogLine } from "~/domain/entities";

/** Error body shape returned by resource routes on failure (from mapError). */
export interface ApiErrorBody {
  readonly error: string;
  readonly message: string;
  readonly hint?: string;
}

/** GET /api/functions → { region, count, functions } */
export interface FunctionsResponse {
  readonly region: string;
  readonly count: number;
  readonly functions: LambdaFunction[];
}

/** GET /api/functions/:name/invocations → { function, count, invocations } */
export interface InvocationsResponse {
  readonly function: string;
  readonly count: number;
  readonly invocations: Invocation[];
}

/** GET /api/functions/:name/invocations/:requestId/logs → { function, requestId, count, logs } */
export interface LogsResponse {
  readonly function: string;
  readonly requestId: string;
  readonly count: number;
  readonly logs: LogLine[];
}

/**
 * GET /api/meta → { profile, region, identity }. As in the old server, STS
 * failures don't block the response: identity may be a mapped error body.
 */
export interface MetaResponse {
  readonly profile: string | null;
  readonly region: string;
  readonly identity: CallerIdentity | ApiErrorBody;
}

/** Optional bounds passed to the invocations resource route. */
export interface InvocationsListQuery {
  readonly startTime?: number | null;
  readonly endTime?: number | null;
}

/** Optional bounds/location passed to the logs resource route. */
export interface LogsQuery {
  readonly logStream?: string | null;
  readonly startTime?: number | null;
  readonly endTime?: number | null;
}
