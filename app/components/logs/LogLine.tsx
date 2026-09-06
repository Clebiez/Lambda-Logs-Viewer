// A single colorized log line for the log console (R6.3): line number, compact
// timestamp (with a full-timestamp tooltip), level-based CSS class, and — when
// the message contains JSON — a collapsible JSON viewer (R6.4). Ported verbatim
// from the old frontend, with imports adapted to the ~/* alias (no .js suffix).

import { ActionIcon, Box, Tooltip } from "@mantine/core";
import JsonView from "@uiw/react-json-view";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import { useMemo, useState } from "react";
import { HighlightAll } from "~/components/shared/Highlight";
import { stripLogPrefix } from "~/domain/log-parsing";
import { formatTime, logLineClass } from "~/lib/format";
import { extractJson } from "~/lib/json-detect";

interface LogLineProps {
  lineNumber: number;
  timestamp: number;
  message: string;
  fullTimestamp: string;
  /** Optional search term; all occurrences in the message get highlighted. */
  search?: string;
}

/** Compact summary of a JSON value, e.g. "{ } 12 keys" or "[ ] 3 items". */
function jsonSummary(value: unknown): string {
  if (Array.isArray(value)) {
    return `[ ] ${value.length} item${value.length > 1 ? "s" : ""}`;
  }
  if (value && typeof value === "object") {
    const n = Object.keys(value).length;
    return `{ } ${n} key${n > 1 ? "s" : ""}`;
  }
  return "";
}

export function LogLine({ lineNumber, timestamp, message, fullTimestamp, search }: LogLineProps) {
  const [expanded, setExpanded] = useState(false);
  // Strip the redundant leading ISO timestamp + RequestId the runtime prepends;
  // the timestamp has its own column and the RequestId is the selected invocation.
  const trimmed = useMemo(() => stripLogPrefix(message.trimEnd()), [message]);

  // JSON detection (memoized: parsing can be expensive).
  const json = useMemo(() => extractJson(trimmed), [trimmed]);
  const levelClass = logLineClass(trimmed);

  // When JSON is detected, the text shown on the line is only the prefix (the
  // text before the JSON). The JSON only appears in the viewer, which avoids
  // seeing it twice.
  const lineText = json ? json.prefix.trimEnd() : trimmed;

  return (
    <div>
      <div className={`log-line ${levelClass}`}>
        <span className="log-num">{lineNumber}</span>
        <Tooltip label={fullTimestamp} openDelay={400} withArrow>
          <span className="log-ts">{formatTime(timestamp)}</span>
        </Tooltip>
        {json ? (
          <Tooltip label={expanded ? "Collapse JSON" : "Read JSON"} withArrow>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="orange"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Toggle JSON viewer"
            >
              {expanded ? "▾" : "▸"}
            </ActionIcon>
          </Tooltip>
        ) : (
          <span style={{ flex: "0 0 16px" }} />
        )}
        <span className="log-msg">
          {search ? <HighlightAll text={lineText} term={search} /> : lineText}
          {json ? (
            <button type="button" className="log-json-chip" onClick={() => setExpanded((v) => !v)}>
              {jsonSummary(json.value)}
            </button>
          ) : null}
        </span>
      </div>

      {json && expanded ? (
        <Box className="log-json">
          <JsonView
            value={json.value as object}
            style={vscodeTheme}
            collapsed={2}
            displayDataTypes={false}
            enableClipboard
          />
        </Box>
      ) : null}
    </div>
  );
}
