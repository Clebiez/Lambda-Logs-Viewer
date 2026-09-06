// Shows loader / error / content depending on a query's state. Ported from the
// old frontend; the ApiError import is adapted to ~/query/client (R2.3).
// Client-safe: renders in the browser, no .server imports, no AWS SDK.
//
// SWR-aware (R5.1-R5.5, R10.2): when cached data exists the component keeps the
// content children rendered on both background revalidation and error, so stale
// content is never wiped by a transient failure. `hasData` tells the component
// whether the caller has data to preserve.

import { Badge, Box, Center, Loader } from "@mantine/core";
import type { ReactNode } from "react";
import { ErrorState } from "~/components/shared/ErrorState";

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
  /** True while a background revalidation is in flight (SWR). */
  isFetching?: boolean;
  /** Whether cached/stale data exists to preserve. Defaults to false. */
  hasData?: boolean;
  /** Optional retry handler surfaced by the error state (e.g. query.refetch). */
  onRetry?: () => void;
}

/** Shows loader / error / content depending on a query's state. */
export function QueryState({
  isLoading,
  error,
  children,
  isFetching = false,
  hasData = false,
  onRetry,
}: QueryStateProps) {
  // Cold load: no data yet → spinner, no children (R5.1).
  if (isLoading && !hasData) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  // Error with no data to fall back on → surface a refined error state
  // (R5.4, R5.5).
  if (error && !hasData) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // Data exists: keep children rendered on both revalidation and error (R5.2,
  // R5.3, R10.2). Show a subtle non-blocking indicator while revalidating.
  return (
    <>
      {isFetching && hasData ? (
        <Box style={{ position: "relative" }}>
          <Badge
            size="xs"
            color="blue"
            variant="light"
            style={{ position: "absolute", top: 0, right: 0, zIndex: 1 }}
          >
            …
          </Badge>
        </Box>
      ) : null}
      {children}
    </>
  );
}
