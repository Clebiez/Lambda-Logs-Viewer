// Browser-only singleton QueryClient shared between root.tsx's QueryClientProvider
// and every route's clientLoader, so they all read/write the same client cache.
//
// Client-safe: plain @tanstack/react-query only. No .server imports and no
// @aws-sdk/* imports — this module is reachable from the browser bundle.
//
// The singleton must never be reused across server requests: on the server we
// build a fresh, non-shared client per call so request state can't leak between
// requests. In the browser we hand back the one module-level instance.

import { QueryClient } from "@tanstack/react-query";

/** Default SWR options, matching the previous inline defaults from root.tsx. */
const defaultOptions = {
  queries: {
    staleTime: 2 * 60 * 1000, // 120_000ms (2 minutes)
    gcTime: 60 * 60 * 1000, // 3_600_000ms (1 hour)
  },
} as const;

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions });
}

// Module-level singleton, created lazily on first browser access.
let browserQueryClient: QueryClient | undefined;

/**
 * Returns the QueryClient to use.
 *
 * - In the browser (`typeof window !== "undefined"`): returns a single shared
 *   module-level instance, creating it on first call.
 * - On the server (`typeof window === "undefined"`): returns a brand-new,
 *   non-shared instance on every call, so the browser singleton is never reused
 *   across server requests.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always a fresh, per-request client. Never cached.
    return createQueryClient();
  }

  // Browser: one shared singleton for the whole session.
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}
