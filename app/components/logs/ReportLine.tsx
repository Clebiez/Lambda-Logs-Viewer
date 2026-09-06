// Metrics banner for a Lambda REPORT line. Rendered ABOVE the log console (not
// as a line inside the dark console surface): instead of the raw
// "REPORT RequestId: … Duration: … Memory Size: …" text, it surfaces the
// invocation metrics as a compact card — duration, memory usage (with a usage
// bar), and, on a cold start, the init duration highlighted.
//
// Presentational: it receives already-parsed ReportMetrics and renders them.

import { Box, Group, Paper, Progress, Text, Tooltip } from "@mantine/core";
import type { ReportMetrics } from "~/domain/log-parsing";

interface ReportLineProps {
  readonly report: ReportMetrics;
}

/** Formats a millisecond duration compactly (e.g. "77 ms", "1.44 s"). */
function fmtMs(ms: number | null): string {
  if (ms == null) return "–";
  if (ms < 1000) return `${ms % 1 === 0 ? ms : ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function fmtMb(mb: number | null): string {
  return mb == null ? "–" : `${mb} MB`;
}

/** One labelled metric in the report card. */
function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Box>
      <Text size="10px" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
        {label}
      </Text>
      <Text size="sm" ff="monospace" fw={600} c={accent ? "lambda.4" : undefined} lh={1.3}>
        {value}
      </Text>
    </Box>
  );
}

/** Renders a REPORT line as a compact metrics card. */
export function ReportLine({ report }: ReportLineProps) {
  const { durationMs, billedDurationMs, memorySizeMb, maxMemoryUsedMb, initDurationMs } = report;

  const usagePct =
    memorySizeMb && maxMemoryUsedMb ? Math.min(100, (maxMemoryUsedMb / memorySizeMb) * 100) : null;

  // Memory pressure tint: green under 60%, orange under 90%, red above.
  const usageColor =
    usagePct == null ? "gray" : usagePct >= 90 ? "red" : usagePct >= 60 ? "orange" : "green";

  const isColdStart = initDurationMs != null;

  return (
    <Paper withBorder radius="md" p="sm" className="report-card">
      <Group gap="xl" wrap="wrap" align="center">
        <Metric label="Duration" value={fmtMs(durationMs)} />
        <Metric label="Billed" value={fmtMs(billedDurationMs)} />

        <Box miw={150}>
          <Group justify="space-between" gap="xs" mb={2}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
              Memory
            </Text>
            <Text size="xs" ff="monospace" c="dimmed">
              {fmtMb(maxMemoryUsedMb)} / {fmtMb(memorySizeMb)}
            </Text>
          </Group>
          {usagePct != null ? (
            <Tooltip label={`${usagePct.toFixed(0)}% of allocated memory`} withArrow>
              <Progress value={usagePct} color={usageColor} size="sm" radius="xl" />
            </Tooltip>
          ) : (
            <Text size="sm" ff="monospace">
              {fmtMb(maxMemoryUsedMb)}
            </Text>
          )}
        </Box>

        {isColdStart ? (
          <Tooltip
            label="Cold start: the runtime had to initialize before handling this request"
            withArrow
            multiline
            w={240}
          >
            <Box className="report-card__coldstart">
              <Metric label="❄ Cold start" value={fmtMs(initDurationMs)} accent />
            </Box>
          </Tooltip>
        ) : null}
      </Group>
    </Paper>
  );
}
