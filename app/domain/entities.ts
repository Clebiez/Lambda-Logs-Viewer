// Domain entities. Purely descriptive, with no dependency on AWS or HTTP.

/** A Lambda function as presented to the user. */
export interface LambdaFunction {
  readonly name: string;
  readonly runtime: string;
  readonly lastModified: string | null;
  readonly description: string;
  readonly memorySize: number | null;
  readonly timeout: number | null;
}

/** Reconstructed status of an invocation. */
export type InvocationStatus = "success" | "error" | "unknown";

/** A Lambda invocation, reconstructed from CloudWatch logs. */
export interface Invocation {
  readonly requestId: string;
  readonly logStreamName: string | null;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly durationMs: number | null;
  readonly billedDurationMs: number | null;
  readonly memorySizeMb: number | null;
  readonly maxMemoryUsedMb: number | null;
  readonly status: InvocationStatus;
}

/** A log line. */
export interface LogLine {
  readonly timestamp: number;
  readonly message: string;
}

/** Current AWS identity (via STS) resolved from the active profile. */
export interface CallerIdentity {
  readonly accountId: string | null;
  readonly arn: string | null;
}
