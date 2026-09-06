// Small "…" badge shown during background SWR revalidation. Purely
// presentational: it renders nothing unless `visible` is true, and it never
// touches the router or query state. Shared across the invocations toolbar and
// the logs toolbar so the revalidation affordance stays consistent (R5.2).

import { Badge } from "@mantine/core";

interface RevalidatingBadgeProps {
  /** True while a background revalidation is in flight. */
  visible: boolean;
}

/** The subtle "…" indicator surfaced while a query revalidates in the background. */
export function RevalidatingBadge({ visible }: RevalidatingBadgeProps) {
  if (!visible) return null;
  return (
    <Badge size="xs" color="blue" variant="light">
      …
    </Badge>
  );
}
