// Demo fixtures for screenshots / trying the UI without AWS.
//
// When the DEMO env var is truthy, the /api/* resource routes short-circuit to
// these deterministic fixtures instead of calling AWS. This lets anyone (and the
// docs screenshot) exercise the full UI — function rail, split view, logs
// console, search, REPORT metrics card with a cold start — with zero AWS setup
// and no real data exposed.
//
// Server-only (`.server.ts`): never bundled for the browser.

import type { Invocation, LambdaFunction, LogLine } from "~/domain/entities";
import type {
  FunctionsResponse,
  InvocationsResponse,
  LogsResponse,
  MetaResponse,
} from "~/query/types";

/** True when the app runs in demo mode (DEMO=1). */
export function isDemoMode(): boolean {
  const v = process.env.DEMO;
  return v != null && v.trim() !== "" && v !== "0" && v.toLowerCase() !== "false";
}

const REGION = "us-east-1";

const FUNCTIONS: LambdaFunction[] = [
  {
    name: "checkout-api-prod",
    runtime: "nodejs20.x",
    lastModified: "2026-09-05T14:20:00.000+0000",
    description: "Checkout HTTP API",
    memorySize: 1024,
    timeout: 30,
  },
  {
    name: "order-processor-prod",
    runtime: "nodejs20.x",
    lastModified: "2026-09-07T09:12:00.000+0000",
    description: "Async order processing",
    memorySize: 1769,
    timeout: 120,
  },
  {
    name: "image-thumbnailer",
    runtime: "python3.12",
    lastModified: "2026-08-30T18:02:00.000+0000",
    description: "S3 image resize",
    memorySize: 2048,
    timeout: 60,
  },
  {
    name: "auth-authorizer",
    runtime: "nodejs20.x",
    lastModified: "2026-09-01T11:45:00.000+0000",
    description: "API Gateway authorizer",
    memorySize: 256,
    timeout: 10,
  },
  {
    name: "daily-report-cron",
    runtime: "python3.12",
    lastModified: "2026-09-06T02:00:00.000+0000",
    description: "Nightly reporting job",
    memorySize: 512,
    timeout: 300,
  },
  {
    name: "webhook-dispatcher",
    runtime: "nodejs20.x",
    lastModified: "2026-09-04T16:33:00.000+0000",
    description: "Outbound webhooks",
    memorySize: 512,
    timeout: 30,
  },
  {
    name: "search-indexer",
    runtime: "nodejs20.x",
    lastModified: "2026-08-28T10:10:00.000+0000",
    description: "OpenSearch indexer",
    memorySize: 1024,
    timeout: 90,
  },
  {
    name: "pdf-generator",
    runtime: "python3.12",
    lastModified: "2026-09-03T13:07:00.000+0000",
    description: "Invoice PDF rendering",
    memorySize: 1536,
    timeout: 60,
  },
];

// Base time for the fixtures (fixed so screenshots are reproducible).
const T0 = Date.parse("2026-09-08T18:51:40.000Z");
const min = 60_000;

const INVOCATIONS: Invocation[] = [
  {
    requestId: "3a8defbf-2950-44be-950a-9a3c88c92a2c",
    logStreamName: "2026/09/08/[$LATEST]abc",
    startTime: T0,
    endTime: T0 + 77,
    durationMs: 77.3,
    billedDurationMs: 444,
    memorySizeMb: 1769,
    maxMemoryUsedMb: 114,
    status: "success",
  },
  {
    requestId: "b1c2d3e4-1111-4a2b-8c3d-4e5f60718293",
    logStreamName: "2026/09/08/[$LATEST]abc",
    startTime: T0 - 3 * min,
    endTime: T0 - 3 * min + 210,
    durationMs: 210.4,
    billedDurationMs: 211,
    memorySizeMb: 1769,
    maxMemoryUsedMb: 512,
    status: "error",
  },
  {
    requestId: "c2d3e4f5-2222-4b3c-9d4e-5f6071829304",
    logStreamName: "2026/09/08/[$LATEST]abc",
    startTime: T0 - 8 * min,
    endTime: T0 - 8 * min + 45,
    durationMs: 45.1,
    billedDurationMs: 46,
    memorySizeMb: 1769,
    maxMemoryUsedMb: 98,
    status: "success",
  },
  {
    requestId: "d3e4f5a6-3333-4c4d-ae5f-60718293a4b5",
    logStreamName: "2026/09/08/[$LATEST]abc",
    startTime: T0 - 15 * min,
    endTime: T0 - 15 * min + 1203,
    durationMs: 1203.7,
    billedDurationMs: 1204,
    memorySizeMb: 1769,
    maxMemoryUsedMb: 890,
    status: "success",
  },
  {
    requestId: "e4f5a6b7-4444-4d5e-bf60-718293a4b5c6",
    logStreamName: "2026/09/08/[$LATEST]abc",
    startTime: T0 - 26 * min,
    endTime: T0 - 26 * min + 62,
    durationMs: 62.0,
    billedDurationMs: 63,
    memorySizeMb: 1769,
    maxMemoryUsedMb: 101,
    status: "unknown",
  },
];

/** A rich log stream for the first (selected) invocation, to show every UI feature. */
function demoLogLines(requestId: string): LogLine[] {
  const ts = (offsetMs: number) => T0 + offsetMs;
  return [
    { timestamp: ts(0), message: `START RequestId: ${requestId} Version: $LATEST` },
    {
      timestamp: ts(2),
      message: `2026-09-08T18:51:40.142Z\t${requestId}\tINFO Received event { "orderId": "ORD-8842", "items": 3, "customer": { "id": "cus_39f", "tier": "gold" } }`,
    },
    {
      timestamp: ts(9),
      message: `2026-09-08T18:51:40.149Z\t${requestId}\tDEBUG Validating payment method`,
    },
    {
      timestamp: ts(21),
      message: `2026-09-08T18:51:40.161Z\t${requestId}\tINFO Charging card via provider`,
    },
    {
      timestamp: ts(40),
      message: `2026-09-08T18:51:40.180Z\t${requestId}\tWARN Provider latency high: 180ms (threshold 150ms)`,
    },
    {
      timestamp: ts(55),
      message: `2026-09-08T18:51:40.195Z\t${requestId}\tINFO Payment authorized { "authId": "auth_7c1", "amount": 129.9, "currency": "USD" }`,
    },
    {
      timestamp: ts(70),
      message: `2026-09-08T18:51:40.210Z\t${requestId}\tINFO Order persisted { "orderId": "ORD-8842", "status": "confirmed" }`,
    },
    { timestamp: ts(76), message: `END RequestId: ${requestId}` },
    {
      timestamp: ts(77),
      message: `REPORT RequestId: ${requestId}\tDuration: 77.30 ms\tBilled Duration: 444 ms\tMemory Size: 1769 MB\tMax Memory Used: 114 MB\tInit Duration: 365.77 ms`,
    },
  ];
}

/** An error-flavored log stream for the failing invocation. */
function demoErrorLogLines(requestId: string): LogLine[] {
  const ts = (offsetMs: number) => T0 - 3 * min + offsetMs;
  return [
    { timestamp: ts(0), message: `START RequestId: ${requestId} Version: $LATEST` },
    {
      timestamp: ts(3),
      message: `2026-09-08T18:48:40.003Z\t${requestId}\tINFO Received event { "orderId": "ORD-8830" }`,
    },
    {
      timestamp: ts(120),
      message: `2026-09-08T18:48:40.120Z\t${requestId}\tERROR Payment provider returned 502 { "provider": "stripe", "attempt": 2 }`,
    },
    {
      timestamp: ts(140),
      message: `2026-09-08T18:48:40.140Z\t${requestId}\t[ERROR] Unhandled Promise rejection: PaymentGatewayError: upstream unavailable`,
    },
    { timestamp: ts(205), message: `END RequestId: ${requestId}` },
    {
      timestamp: ts(210),
      message: `REPORT RequestId: ${requestId}\tDuration: 210.40 ms\tBilled Duration: 211 ms\tMemory Size: 1769 MB\tMax Memory Used: 512 MB`,
    },
  ];
}

export const demo = {
  meta(): MetaResponse {
    return {
      profile: "demo",
      region: REGION,
      identity: {
        accountId: "123456789012",
        arn: "arn:aws:sts::123456789012:assumed-role/Demo/demo",
      },
    };
  },

  functions(): FunctionsResponse {
    return { region: REGION, count: FUNCTIONS.length, functions: FUNCTIONS };
  },

  invocations(functionName: string): InvocationsResponse {
    return { function: functionName, count: INVOCATIONS.length, invocations: INVOCATIONS };
  },

  logs(functionName: string, requestId: string): LogsResponse {
    // The known "error" invocation gets the error-flavored stream; anything else
    // gets the rich success stream (so a fresh screenshot always has content).
    const lines =
      requestId === "b1c2d3e4-1111-4a2b-8c3d-4e5f60718293"
        ? demoErrorLogLines(requestId)
        : demoLogLines(requestId);
    return { function: functionName, requestId, count: lines.length, logs: lines };
  },
};
