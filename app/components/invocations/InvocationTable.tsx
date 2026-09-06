// Table of reconstructed invocations. Presentational: it renders a NON-EMPTY
// list of rows and reports a row click through `onSelect` — it never navigates
// or reads the URL, and the route decides when to show the empty state instead
// of this table. Rows keep the `inv-row inv-{status}` classNames for the
// per-status coloring (R6.2) and the status badge is delegated to
// InvocationStatusBadge.

import { Table } from "@mantine/core";
import { InvocationStatusBadge } from "~/components/invocations/InvocationStatusBadge";
import type { Invocation } from "~/domain/entities";
import { formatDate } from "~/lib/format";

interface InvocationTableProps {
  readonly invocations: Invocation[];
  readonly onSelect: (inv: Invocation) => void;
  /** The requestId of the row currently open in the logs panel, if any. */
  readonly selectedRequestId?: string | null;
  /** Compact mode drops secondary columns for the narrow split-view table. */
  readonly compact?: boolean;
}

/** Renders the invocation rows. Caller guarantees a non-empty list. */
export function InvocationTable({
  invocations,
  onSelect,
  selectedRequestId,
  compact = false,
}: InvocationTableProps) {
  return (
    <Table highlightOnHover stickyHeader className="inv-table">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={compact ? 90 : undefined}>Status</Table.Th>
          <Table.Th>Start</Table.Th>
          <Table.Th ta="right">Duration</Table.Th>
          {compact ? null : <Table.Th ta="right">Max memory</Table.Th>}
          {compact ? null : <Table.Th>Request ID</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {invocations.map((inv) => (
          <Table.Tr
            key={inv.requestId}
            className={`inv-row inv-${inv.status}`}
            data-selected={inv.requestId === selectedRequestId || undefined}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(inv)}
          >
            <Table.Td>
              <InvocationStatusBadge status={inv.status} />
            </Table.Td>
            <Table.Td>{formatDate(inv.startTime)}</Table.Td>
            <Table.Td ff="monospace" ta="right">
              {inv.durationMs != null ? `${inv.durationMs} ms` : "-"}
            </Table.Td>
            {compact ? null : (
              <Table.Td ff="monospace" ta="right">
                {inv.maxMemoryUsedMb != null ? `${inv.maxMemoryUsedMb} MB` : "-"}
              </Table.Td>
            )}
            {compact ? null : <Table.Td ff="monospace">{inv.requestId}</Table.Td>}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
