// A single dense row in the persistent functions rail. Presentational: reports a
// click and renders the highlighted name (truncated at the end) plus a discreet,
// right-aligned runtime line. The active row is visually pinned. No router / URL
// access here.

import { Box, Text, UnstyledButton } from "@mantine/core";
import { Highlight } from "~/components/shared/Highlight";
import type { LambdaFunction } from "~/domain/entities";

interface FunctionRailItemProps {
  readonly fn: LambdaFunction;
  readonly filter: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

/** One clickable function row in the rail. */
export function FunctionRailItem({ fn, filter, active, onClick }: FunctionRailItemProps) {
  return (
    <UnstyledButton onClick={onClick} data-active={active || undefined} className="fn-rail-item">
      <Box style={{ minWidth: 0 }} ta="left">
        <Text ff="monospace" size="xs" truncate="end" fw={active ? 600 : 500} title={fn.name}>
          <Highlight text={fn.name} term={filter} />
        </Text>
        <Text size="10px" c="dimmed" truncate="end" mt={2} ta="right">
          {fn.runtime}
          {fn.memorySize ? ` · ${fn.memorySize} MB` : ""}
        </Text>
      </Box>
    </UnstyledButton>
  );
}
