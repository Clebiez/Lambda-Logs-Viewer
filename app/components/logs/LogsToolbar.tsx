// Header row for the logs panel. Left: a full-text search box + level filter
// (all / errors / warnings) driven by counts. Right: a copy button with
// transient "Copied" feedback. Purely presentational — it owns no data or URL
// state; the LogsPanel passes current values and callbacks.

import { ActionIcon, Badge, Button, Group, SegmentedControl, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";

/** Level filter applied to the log console. */
export type LogLevelFilter = "all" | "errors" | "warnings";

interface LogsToolbarProps {
  readonly counts: { readonly total: number; readonly errors: number; readonly warnings: number };
  /** Number of lines matching the current search + level filter. */
  readonly matchCount: number;
  readonly search: string;
  readonly levelFilter: LogLevelFilter;
  readonly canCopy: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onLevelFilterChange: (value: LogLevelFilter) => void;
  readonly onCopy: () => void;
}

/** Presentational header row for the logs panel: search, filters, copy. */
export function LogsToolbar({
  counts,
  matchCount,
  search,
  levelFilter,
  canCopy,
  onSearchChange,
  onLevelFilterChange,
  onCopy,
}: LogsToolbarProps) {
  const filtering = search.trim() !== "" || levelFilter !== "all";

  return (
    <Group justify="space-between" wrap="wrap" gap="xs">
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 240 }}>
        <TextInput
          size="xs"
          flex={1}
          placeholder="Search logs…"
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          rightSection={
            search ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                ×
              </ActionIcon>
            ) : null
          }
        />
        <SegmentedControl
          size="xs"
          value={levelFilter}
          onChange={(v) => onLevelFilterChange(v as LogLevelFilter)}
          data={[
            { value: "all", label: `All ${counts.total}` },
            { value: "errors", label: `Err ${counts.errors}` },
            { value: "warnings", label: `Warn ${counts.warnings}` },
          ]}
        />
        {filtering ? (
          <Badge variant="light" color="gray" size="sm">
            {matchCount} shown
          </Badge>
        ) : null}
      </Group>

      <CopyButton disabled={!canCopy} onCopy={onCopy} />
    </Group>
  );
}

/** Copy button that shows a transient "Copied" confirmation. */
function CopyButton({ disabled, onCopy }: { disabled: boolean; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Button
      size="xs"
      variant="default"
      disabled={disabled}
      onClick={() => {
        onCopy();
        setCopied(true);
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </Button>
  );
}
