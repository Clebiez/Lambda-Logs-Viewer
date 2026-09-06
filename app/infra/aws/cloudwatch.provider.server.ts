// Provider: implements LogProvider via CloudWatch Logs.
// Fetches the raw events; grouping into invocations and filtering are done in
// the domain (log-parsing). Server-only.

import {
  type CloudWatchLogsClient,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type { RawLogEvent } from "~/domain/log-parsing";
import type { LogProvider, LogQuery, TimeWindow } from "~/domain/ports";

const MAX_LIFECYCLE_ITERATIONS = 10;
const MAX_ERROR_ITERATIONS = 5;
const MAX_LOG_ITERATIONS = 20;
const TIME_WINDOW_PADDING_MS = 5000;

// Lifecycle markers: few in number, they let us quickly establish the list of
// invocations and control pagination.
const LIFECYCLE_FILTER = "?START ?END ?REPORT";
// Error lines: a separate, targeted query (otherwise common terms like
// "Error"/"Task" flood the pagination and make it very slow).
const ERROR_FILTER = '?ERROR ?Exception ?"Task timed out"';

/** Name of the CloudWatch log group associated with a Lambda. */
function logGroupName(functionName: string): string {
  return `/aws/lambda/${functionName}`;
}

export class CloudWatchLogProvider implements LogProvider {
  constructor(private readonly client: CloudWatchLogsClient) {}

  /**
   * Two targeted queries, then a merge:
   *  1) lifecycle (fast) → establishes the invocations over the requested window;
   *  2) error lines (same window) → flags the failures.
   * The scope is bounded by the time window (startTime/endTime); an iteration
   * guard prevents endless pagination on very large logs.
   */
  async fetchInvocationReconstructionEvents(
    functionName: string,
    window: TimeWindow,
  ): Promise<RawLogEvent[]> {
    const logGroupName_ = logGroupName(functionName);

    // 1) Lifecycle.
    const lifecycle: RawLogEvent[] = [];
    let nextToken: string | undefined;
    let iterations = 0;

    do {
      const resp = await this.client.send(
        new FilterLogEventsCommand({
          logGroupName: logGroupName_,
          filterPattern: LIFECYCLE_FILTER,
          limit: 1000,
          nextToken,
          ...(window.startTime !== undefined ? { startTime: window.startTime } : {}),
          ...(window.endTime !== undefined ? { endTime: window.endTime } : {}),
        }),
      );

      for (const event of resp.events ?? []) {
        if (event.message === undefined || event.timestamp === undefined) continue;
        lifecycle.push({
          timestamp: event.timestamp,
          message: event.message,
          logStreamName: event.logStreamName ?? null,
        });
      }

      nextToken = resp.nextToken;
      iterations += 1;
    } while (nextToken && iterations < MAX_LIFECYCLE_ITERATIONS);

    if (lifecycle.length === 0) return lifecycle;

    // 2) Error lines, bounded to the window actually covered by the lifecycle
    // (from the oldest START to the most recent event), to stay fast.
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    for (const e of lifecycle) {
      if (e.timestamp < minTs) minTs = e.timestamp;
      if (e.timestamp > maxTs) maxTs = e.timestamp;
    }

    const errors: RawLogEvent[] = [];
    let errNext: string | undefined;
    let errIter = 0;
    do {
      const resp = await this.client.send(
        new FilterLogEventsCommand({
          logGroupName: logGroupName_,
          filterPattern: ERROR_FILTER,
          limit: 1000,
          nextToken: errNext,
          startTime: minTs - TIME_WINDOW_PADDING_MS,
          endTime: maxTs + TIME_WINDOW_PADDING_MS,
        }),
      );
      for (const event of resp.events ?? []) {
        if (event.message === undefined || event.timestamp === undefined) continue;
        errors.push({
          timestamp: event.timestamp,
          message: event.message,
          logStreamName: event.logStreamName ?? null,
        });
      }
      errNext = resp.nextToken;
      errIter += 1;
    } while (errNext && errIter < MAX_ERROR_ITERATIONS);

    return [...lifecycle, ...errors];
  }

  async fetchInvocationEvents(
    functionName: string,
    requestId: string,
    query: LogQuery,
  ): Promise<RawLogEvent[]> {
    const logGroupName_ = logGroupName(functionName);
    const startTime =
      query.startTime !== undefined ? query.startTime - TIME_WINDOW_PADDING_MS : undefined;
    const endTime =
      query.endTime !== undefined ? query.endTime + TIME_WINDOW_PADDING_MS : undefined;

    if (query.logStreamName) {
      return this.fetchFromStream(logGroupName_, query.logStreamName, startTime, endTime);
    }
    return this.fetchByFilter(logGroupName_, requestId, startTime, endTime);
  }

  private async fetchFromStream(
    logGroupName_: string,
    logStreamName: string,
    startTime: number | undefined,
    endTime: number | undefined,
  ): Promise<RawLogEvent[]> {
    const events: RawLogEvent[] = [];
    let nextToken: string | undefined;
    let guard = 0;

    do {
      const resp = await this.client.send(
        new GetLogEventsCommand({
          logGroupName: logGroupName_,
          logStreamName,
          startTime,
          endTime,
          startFromHead: true,
          nextToken,
        }),
      );
      for (const e of resp.events ?? []) {
        if (e.message === undefined || e.timestamp === undefined) continue;
        events.push({ timestamp: e.timestamp, message: e.message });
      }
      // GetLogEvents returns the same token when there is nothing left.
      if (resp.nextForwardToken === nextToken) break;
      nextToken = resp.nextForwardToken;
      guard += 1;
    } while (guard < MAX_LOG_ITERATIONS);

    return events;
  }

  private async fetchByFilter(
    logGroupName_: string,
    requestId: string,
    startTime: number | undefined,
    endTime: number | undefined,
  ): Promise<RawLogEvent[]> {
    const events: RawLogEvent[] = [];
    let nextToken: string | undefined;
    let guard = 0;

    do {
      const resp = await this.client.send(
        new FilterLogEventsCommand({
          logGroupName: logGroupName_,
          filterPattern: `"${requestId}"`,
          startTime,
          endTime,
          limit: 1000,
          nextToken,
        }),
      );
      for (const e of resp.events ?? []) {
        if (e.message === undefined || e.timestamp === undefined) continue;
        events.push({ timestamp: e.timestamp, message: e.message });
      }
      nextToken = resp.nextToken;
      guard += 1;
    } while (nextToken && guard < MAX_LOG_ITERATIONS);

    return events;
  }
}
