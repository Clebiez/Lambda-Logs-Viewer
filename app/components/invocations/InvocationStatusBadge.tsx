// Colored status badge for a reconstructed invocation status (R6.2).
// Presentational: it maps a status to color/label/icon and renders the Mantine
// Badge — no router, no query, no URL access.

import { Badge } from "@mantine/core";
import type { InvocationStatus } from "~/domain/entities";

function statusColor(status: InvocationStatus): string {
  if (status === "success") return "green";
  if (status === "error") return "red";
  return "gray";
}

function statusLabel(status: InvocationStatus): string {
  if (status === "success") return "Success";
  if (status === "error") return "Error";
  return "Unknown";
}

interface InvocationStatusBadgeProps {
  readonly status: InvocationStatus;
}

/**
 * Renders a quiet, color-coded dot + label for an invocation status. A light
 * variant keeps color as a signal rather than a loud filled block; the actual
 * row emphasis comes from the table's left border.
 */
export function InvocationStatusBadge({ status }: InvocationStatusBadgeProps) {
  return (
    <Badge
      color={statusColor(status)}
      variant="light"
      size="sm"
      radius="sm"
      leftSection={
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
          }}
        />
      }
    >
      {statusLabel(status)}
    </Badge>
  );
}
