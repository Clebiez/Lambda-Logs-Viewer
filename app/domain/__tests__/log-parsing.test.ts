import { describe, expect, it } from "vitest";
import {
  buildInvocations,
  extractRequestId,
  isErrorLine,
  parseLifecycleLine,
  parseReport,
  parseReportLine,
  selectInvocationLogs,
  stripLogPrefix,
} from "../log-parsing";
import type { RawLogEvent } from "../log-parsing";

// --- stripLogPrefix ---

describe("stripLogPrefix", () => {
  const uuid = "c30abd59-9048-459e-90ee-0ea0748ff59e";

  it("removes a leading ISO timestamp + RequestId (tab-separated)", () => {
    const line = `2026-09-08T18:51:40.142Z\t${uuid}\tDEBUG payload`;
    expect(stripLogPrefix(line)).toBe("DEBUG payload");
  });

  it("removes the timestamp even when no RequestId follows", () => {
    expect(stripLogPrefix("2026-09-08T18:51:40.142Z\tplain message")).toBe("plain message");
  });

  it("removes a leading RequestId when there is no timestamp", () => {
    expect(stripLogPrefix(`${uuid}\tINFO hello`)).toBe("INFO hello");
  });

  it("leaves lifecycle lines untouched", () => {
    const line = "START RequestId: abc-123 Version: $LATEST";
    expect(stripLogPrefix(line)).toBe(line);
  });

  it("leaves a free-form line without the runtime prefix untouched", () => {
    expect(stripLogPrefix("just some text")).toBe("just some text");
  });

  it("does not strip a UUID that is not at the start", () => {
    const line = `error for request ${uuid}`;
    expect(stripLogPrefix(line)).toBe(line);
  });
});

// --- parseLifecycleLine ---

describe("parseLifecycleLine", () => {
  it("parses a START line", () => {
    const result = parseLifecycleLine("START RequestId: abc-123-def Version: $LATEST");
    expect(result).toEqual({ type: "START", requestId: "abc-123-def" });
  });

  it("parses an END line", () => {
    const result = parseLifecycleLine("END RequestId: abc-123-def");
    expect(result).toEqual({ type: "END", requestId: "abc-123-def" });
  });

  it("parses a REPORT line with metrics", () => {
    const line =
      "REPORT RequestId: abc-123-def Duration: 12.34 ms Billed Duration: 13 ms " +
      "Memory Size: 128 MB Max Memory Used: 75 MB";
    const result = parseLifecycleLine(line);
    expect(result).toEqual({
      type: "REPORT",
      requestId: "abc-123-def",
      report: {
        durationMs: 12.34,
        billedDurationMs: 13,
        memorySizeMb: 128,
        maxMemoryUsedMb: 75,
        initDurationMs: null,
      },
    });
  });

  it("returns null for an application line", () => {
    expect(parseLifecycleLine("INFO: hello world")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseLifecycleLine(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLifecycleLine("")).toBeNull();
  });
});

// --- parseReport ---

describe("parseReport", () => {
  it("extracts all metrics (warm invocation, no init duration)", () => {
    const line =
      "REPORT RequestId: x Duration: 100.5 ms Billed Duration: 101 ms " +
      "Memory Size: 256 MB Max Memory Used: 130 MB";
    expect(parseReport(line)).toEqual({
      durationMs: 100.5,
      billedDurationMs: 101,
      memorySizeMb: 256,
      maxMemoryUsedMb: 130,
      initDurationMs: null,
    });
  });

  it("extracts the init duration on a cold start", () => {
    const line =
      "REPORT RequestId: 3a8defbf-2950-44be-950a-9a3c88c92a2c\tDuration: 77.30 ms\t" +
      "Billed Duration: 444 ms\tMemory Size: 1769 MB\tMax Memory Used: 114 MB\t" +
      "Init Duration: 365.77 ms";
    expect(parseReport(line)).toEqual({
      durationMs: 77.3,
      billedDurationMs: 444,
      memorySizeMb: 1769,
      maxMemoryUsedMb: 114,
      initDurationMs: 365.77,
    });
  });

  it("returns null for missing metrics", () => {
    expect(parseReport("REPORT RequestId: x")).toEqual({
      durationMs: null,
      billedDurationMs: null,
      memorySizeMb: null,
      maxMemoryUsedMb: null,
      initDurationMs: null,
    });
  });
});

// --- parseReportLine ---

describe("parseReportLine", () => {
  it("returns the metrics for a REPORT line", () => {
    const line = "REPORT RequestId: abc-123 Duration: 10 ms Billed Duration: 11 ms";
    expect(parseReportLine(line)?.durationMs).toBe(10);
  });

  it("returns null for a non-REPORT line", () => {
    expect(parseReportLine("START RequestId: x")).toBeNull();
    expect(parseReportLine("some app log")).toBeNull();
  });
});

// --- buildInvocations ---

describe("buildInvocations", () => {
  const makeEvents = (): RawLogEvent[] => [
    { timestamp: 1000, message: "START RequestId: aaa-111", logStreamName: "stream-1" },
    { timestamp: 1100, message: "END RequestId: aaa-111", logStreamName: "stream-1" },
    {
      timestamp: 1200,
      message:
        "REPORT RequestId: aaa-111 Duration: 50 ms Billed Duration: 100 ms " +
        "Memory Size: 128 MB Max Memory Used: 64 MB",
      logStreamName: "stream-1",
    },
    { timestamp: 2000, message: "START RequestId: bbb-222", logStreamName: "stream-2" },
    { timestamp: 2100, message: "END RequestId: bbb-222", logStreamName: "stream-2" },
    {
      timestamp: 2200,
      message:
        "REPORT RequestId: bbb-222 Duration: 30 ms Billed Duration: 100 ms " +
        "Memory Size: 256 MB Max Memory Used: 100 MB",
      logStreamName: "stream-2",
    },
  ];

  it("reconstructs 2 invocations sorted from most recent to oldest", () => {
    const result = buildInvocations(makeEvents());
    expect(result).toHaveLength(2);
    expect(result[0]!.requestId).toBe("bbb-222");
    expect(result[1]!.requestId).toBe("aaa-111");
  });

  it("fills the fields of the first invocation", () => {
    const result = buildInvocations(makeEvents());
    const inv = result[1]!; // aaa-111
    expect(inv.startTime).toBe(1000);
    expect(inv.endTime).toBe(1100);
    expect(inv.durationMs).toBe(50);
    expect(inv.billedDurationMs).toBe(100);
    expect(inv.memorySizeMb).toBe(128);
    expect(inv.maxMemoryUsedMb).toBe(64);
    expect(inv.status).toBe("success");
    expect(inv.logStreamName).toBe("stream-1");
  });

  it("handles an empty stream", () => {
    expect(buildInvocations([])).toEqual([]);
  });

  it("handles an incomplete invocation (START only)", () => {
    const events: RawLogEvent[] = [
      { timestamp: 500, message: "START RequestId: ccc-333", logStreamName: "s" },
    ];
    const result = buildInvocations(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.startTime).toBe(500);
    expect(result[0]!.endTime).toBeNull();
    expect(result[0]!.status).toBe("unknown");
  });
});

// --- selectInvocationLogs ---

describe("selectInvocationLogs", () => {
  const events: RawLogEvent[] = [
    { timestamp: 3, message: "INFO abc-123 hello" },
    { timestamp: 1, message: "START RequestId: abc-123" },
    { timestamp: 2, message: "unrelated line" },
    { timestamp: 4, message: "REPORT RequestId: abc-123 Duration: 10 ms" },
  ];

  it("filters and sorts the lines containing the requestId", () => {
    const result = selectInvocationLogs(events, "abc-123");
    expect(result).toHaveLength(3);
    expect(result[0]!.timestamp).toBe(1);
    expect(result[2]!.timestamp).toBe(4);
  });

  it("returns everything if no line matches (sorted)", () => {
    const result = selectInvocationLogs(events, "zzz-999");
    expect(result).toHaveLength(4);
    expect(result[0]!.timestamp).toBe(1);
    expect(result[3]!.timestamp).toBe(4);
  });
});

// --- isErrorLine ---

describe("isErrorLine", () => {
  it("detects a Lambda timeout", () => {
    expect(isErrorLine("2024-01-01 abc Task timed out after 3.00 seconds")).toBe(true);
  });

  it("detects an [ERROR] marker", () => {
    expect(isErrorLine("2024-01-01\t[ERROR]\tsomething broke")).toBe(true);
  });

  it("detects an exception", () => {
    expect(isErrorLine("TypeError: cannot read property x")).toBe(true);
    expect(isErrorLine('{"errorMessage":"boom","errorType":"Error"}')).toBe(true);
  });

  it("does not match a normal line", () => {
    expect(isErrorLine("INFO handling request ok")).toBe(false);
    expect(isErrorLine("START RequestId: abc-123")).toBe(false);
  });
});

// --- extractRequestId ---

describe("extractRequestId", () => {
  it("extracts a RequestId UUID", () => {
    const msg = "2024-01-01T10:00:00Z\t1fed727e-2fcc-4e1c-8be4-7082bcce01cd\tERROR\tboom";
    expect(extractRequestId(msg)).toBe("1fed727e-2fcc-4e1c-8be4-7082bcce01cd");
  });

  it("returns null without a UUID", () => {
    expect(extractRequestId("no id here")).toBeNull();
  });
});

// --- buildInvocations: error detection ---

describe("buildInvocations (error status)", () => {
  const uuid = "1fed727e-2fcc-4e1c-8be4-7082bcce01cd";

  it("marks an invocation as error if an error line is present", () => {
    const events: RawLogEvent[] = [
      { timestamp: 1, message: `START RequestId: ${uuid} Version: $LATEST` },
      { timestamp: 2, message: `2024-01-01\t${uuid}\t[ERROR]\tUnhandled exception` },
      { timestamp: 3, message: `END RequestId: ${uuid}` },
      { timestamp: 4, message: `REPORT RequestId: ${uuid} Duration: 10 ms` },
    ];
    const result = buildInvocations(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("error");
  });

  it("the error takes precedence over the REPORT (success)", () => {
    const events: RawLogEvent[] = [
      { timestamp: 1, message: `REPORT RequestId: ${uuid} Duration: 10 ms` },
      { timestamp: 2, message: `${uuid} Task timed out after 3.00 seconds` },
    ];
    const result = buildInvocations(events);
    expect(result[0]!.status).toBe("error");
  });

  it("stays 'success' without an error line", () => {
    const events: RawLogEvent[] = [
      { timestamp: 1, message: `START RequestId: ${uuid}` },
      { timestamp: 2, message: `REPORT RequestId: ${uuid} Duration: 10 ms` },
    ];
    const result = buildInvocations(events);
    expect(result[0]!.status).toBe("success");
  });
});
