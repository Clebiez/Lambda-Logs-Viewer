// Scrollable, VIRTUALIZED log console: renders only the visible log lines so it
// stays smooth with thousands of entries. Rows have variable height (a line can
// expand an inline JSON viewer), so we measure each rendered row dynamically via
// the virtualizer's measureElement.
//
// Presentational — it maps each entry to a <LogLine> and touches no router or
// query state. The route/panel decides the empty state; this renders rows only.

import { Paper } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { LogLine } from "~/components/logs/LogLine";
import type { LogLine as LogLineEntity } from "~/domain/entities";
import { formatDate } from "~/lib/format";

interface LogConsoleProps {
  readonly logs: LogLineEntity[];
  /** Optional search term forwarded to each line for match highlighting. */
  readonly search?: string;
}

// Estimated collapsed line height (px). The real height is measured after mount;
// this is only the initial guess used before measurement.
const ESTIMATED_LINE_HEIGHT = 24;

/** Renders the colorized, virtualized log console for a set of log lines. */
export function LogConsole({ logs, search }: LogConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: 20,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <Paper withBorder p={0} className="log-console">
      <div
        ref={scrollRef}
        style={{ maxHeight: "72vh", overflow: "auto" }}
        className="log-console__scroll"
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", padding: "8px 0" }}>
          {items.map((item) => {
            const line = logs[item.index]!;
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <LogLine
                  lineNumber={item.index + 1}
                  timestamp={line.timestamp}
                  message={line.message}
                  fullTimestamp={formatDate(line.timestamp)}
                  search={search}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Paper>
  );
}
