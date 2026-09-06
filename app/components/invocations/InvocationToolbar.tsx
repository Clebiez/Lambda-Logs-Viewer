// Toolbar for the invocations page: status filter (SegmentedControl), time-range
// selector (Select) and the auto-refresh toggle (Switch). All view state lives
// in the URL (R4.2), but this component never reads or writes it — it receives
// the current values as props and reports changes through callbacks. The route
// owns the URL. The "…" revalidation indicator is delegated to the shared
// RevalidatingBadge (R5.2, R9).

import { Group, SegmentedControl, Select, Switch } from "@mantine/core";
import { RevalidatingBadge } from "~/components/shared/RevalidatingBadge";
import type { StatusFilter } from "~/lib/search-params";
import type { TimeRangeKey } from "~/lib/time-range";

interface InvocationToolbarProps {
  readonly statusFilter: StatusFilter;
  readonly counts: { readonly all: number; readonly success: number; readonly error: number };
  readonly rangeKey: TimeRangeKey;
  readonly rangeOptions: { value: TimeRangeKey; label: string }[];
  readonly autoRefresh: boolean;
  readonly isFetching: boolean;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onRangeChange: (value: TimeRangeKey) => void;
  readonly onAutoRefreshChange: (checked: boolean) => void;
}

/** Presentational controls row for the invocations page. */
export function InvocationToolbar({
  statusFilter,
  counts,
  rangeKey,
  rangeOptions,
  autoRefresh,
  isFetching,
  onStatusChange,
  onRangeChange,
  onAutoRefreshChange,
}: InvocationToolbarProps) {
  return (
    <Group justify="space-between" wrap="wrap">
      <Group gap="sm">
        <SegmentedControl
          size="xs"
          value={statusFilter}
          onChange={(v) => onStatusChange(v as StatusFilter)}
          data={[
            { value: "all", label: `All (${counts.all})` },
            { value: "success", label: `Success (${counts.success})` },
            { value: "error", label: `Error (${counts.error})` },
          ]}
        />
        <Select
          size="xs"
          w={150}
          value={rangeKey}
          onChange={(v) => onRangeChange(v as TimeRangeKey)}
          data={rangeOptions}
          allowDeselect={false}
          aria-label="Time range"
        />
      </Group>
      <Switch
        size="sm"
        checked={autoRefresh}
        onChange={(e) => onAutoRefreshChange(e.currentTarget.checked)}
        label={
          <Group gap={6}>
            <span>Auto-refresh</span>
            <RevalidatingBadge visible={autoRefresh && isFetching} />
          </Group>
        }
      />
    </Group>
  );
}
