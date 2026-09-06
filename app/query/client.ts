// Typed fetch client for the resource routes (routes/api.*). Centralizes fetch +
// error handling. No business logic. Client-safe: plain fetch, no .server
// imports, no AWS SDK — this runs in the browser as react-query's queryFn.
//
// Ported from the old packages/frontend/src/api/client.ts. The paths are the
// same /api/* paths (the RR resource routes mirror the old Express endpoints),
// so query fns stay plain fetch calls and the react-query devtools stay
// meaningful.

import type {
  ApiErrorBody,
  FunctionsResponse,
  InvocationsListQuery,
  InvocationsResponse,
  LogsQuery,
  LogsResponse,
  MetaResponse,
} from "~/query/types";

/** Error thrown by the client, carrying a machine name and an optional hint. */
export class ApiError extends Error {
  constructor(
    override readonly name: string,
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    // Network failure, aborted request, server unreachable…
    throw new ApiError(
      "NetworkError",
      "Could not reach the server.",
      "Check the server and your AWS credentials/profile.",
    );
  }

  // Read the raw body once. An empty body (aborted/slow/timed-out request or a
  // 5xx with no payload) must not crash with "Unexpected end of JSON input".
  const raw = await res.text();

  let data: unknown;
  if (raw.trim() === "") {
    data = undefined;
  } else {
    try {
      data = JSON.parse(raw);
    } catch {
      // Non-JSON response (e.g. an HTML error page).
      const message = res.ok ? "The server returned a non-JSON response." : res.statusText;
      throw new ApiError(res.ok ? "ParseError" : `HTTP ${res.status}`, message || "Request failed");
    }
  }

  if (!res.ok) {
    const body = (data ?? {}) as ApiErrorBody;
    throw new ApiError(
      body.error ?? `HTTP ${res.status}`,
      body.message ?? (res.statusText || "Request failed"),
      body.hint,
    );
  }

  if (data === undefined) {
    throw new ApiError(
      "EmptyResponse",
      "The server returned an empty response.",
      "The request may have timed out (large log window or slow AWS call). Try a shorter time range.",
    );
  }

  return data as T;
}

// Appends a query string to a path when there are params to add.
function withQuery(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const api = {
  getMeta: (): Promise<MetaResponse> => request<MetaResponse>("/api/meta"),

  listFunctions: (): Promise<FunctionsResponse> => request<FunctionsResponse>("/api/functions"),

  listInvocations: (
    functionName: string,
    query: InvocationsListQuery = {},
  ): Promise<InvocationsResponse> => {
    const params = new URLSearchParams();
    if (query.startTime != null) params.set("startTime", String(query.startTime));
    if (query.endTime != null) params.set("endTime", String(query.endTime));
    return request<InvocationsResponse>(
      withQuery(`/api/functions/${encodeURIComponent(functionName)}/invocations`, params),
    );
  },

  getInvocationLogs: (
    functionName: string,
    requestId: string,
    query: LogsQuery = {},
  ): Promise<LogsResponse> => {
    const params = new URLSearchParams();
    if (query.logStream) params.set("logStream", query.logStream);
    if (query.startTime != null) params.set("startTime", String(query.startTime));
    if (query.endTime != null) params.set("endTime", String(query.endTime));
    return request<LogsResponse>(
      withQuery(
        `/api/functions/${encodeURIComponent(functionName)}/invocations/${encodeURIComponent(
          requestId,
        )}/logs`,
        params,
      ),
    );
  },
};
