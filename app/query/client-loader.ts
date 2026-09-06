// clientLoader cache bridge. Shared helper so each route's clientLoader stays
// tiny: it resolves the active profile from the URL, then defers to the
// TanStack Query client cache via ensureQueryData with the SAME key + queryFn
// the corresponding useQuery hook uses. A warm entry returns instantly (no
// fetch, no server hop, no AWS); a cold entry does exactly one /api/* fetch and
// caches the result.
//
// Client-safe: no .server imports, no @aws-sdk/* imports. Fetches only ever go
// through ~/query/client's api.* helpers (which hit /api/* paths).

import { getQueryClient } from "~/query/client-instance";

/**
 * Ensure a cache key is populated (from the client cache or a single fetch) and
 * return its envelope.
 *
 * - Warm entry: `ensureQueryData` returns the cached value synchronously without
 *   invoking `queryFn` (Requirement 1.1).
 * - Cold entry: `ensureQueryData` invokes `queryFn` exactly once and stores the
 *   returned envelope under `key` (Requirement 1.2).
 * - Cold-entry failure: the rejection propagates to the caller (surfacing as an
 *   ApiError to the hook) and no warm entry is stored — `ensureQueryData` does
 *   not cache rejected fetches (Requirement 1.3).
 *
 * The `key` and `queryFn` passed here must be structurally equal to the ones the
 * matching SWR hook uses so the clientLoader and hook share one cache entry
 * (Requirements 3.1, 3.2).
 */
export function ensure<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime?: number,
): Promise<T> {
  return getQueryClient().ensureQueryData({
    queryKey: key,
    queryFn,
    staleTime,
  });
}
