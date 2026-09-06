// Domain provider interfaces (ports). The application depends on these
// abstractions; the infrastructure implements them (dependency inversion, the
// D in SOLID). Services receive concrete implementations via injected Deps.

import type { CallerIdentity, LambdaFunction } from "./entities";
import type { RawLogEvent } from "./log-parsing";

/** Optional time window and location for fetching logs. */
export interface LogQuery {
  readonly startTime?: number;
  readonly endTime?: number;
  readonly logStreamName?: string;
}

/** A time window (ms epoch bounds) used to scope invocation reconstruction. */
export interface TimeWindow {
  /** Lower time bound (ms epoch), optional. */
  readonly startTime?: number;
  /** Upper time bound (ms epoch), optional. */
  readonly endTime?: number;
}

/** Access to Lambda functions (provider). */
export interface FunctionProvider {
  listFunctions(): Promise<LambdaFunction[]>;
}

/** Access to CloudWatch logs (provider). */
export interface LogProvider {
  /**
   * Fetches the events needed to reconstruct invocations: lifecycle markers
   * (START/END/REPORT) AND error lines, over the requested time window.
   */
  fetchInvocationReconstructionEvents(
    functionName: string,
    window: TimeWindow,
  ): Promise<RawLogEvent[]>;

  /** Fetches the log events corresponding to an invocation. */
  fetchInvocationEvents(
    functionName: string,
    requestId: string,
    query: LogQuery,
  ): Promise<RawLogEvent[]>;
}

/** Access to the current AWS identity (provider). */
export interface IdentityProvider {
  getCallerIdentity(): Promise<Pick<CallerIdentity, "accountId" | "arn">>;
}
