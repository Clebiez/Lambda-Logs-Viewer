import { describe, expect, it, vi } from "vitest";
import type { LambdaFunction } from "~/domain/entities";
import type { RawLogEvent } from "~/domain/log-parsing";
import type { FunctionProvider, IdentityProvider, LogProvider } from "~/domain/ports";
import type { Deps } from "../container.server";
import { listFunctions } from "../functions.server";
import { getCallerIdentity } from "../identity.server";
import { listInvocations } from "../invocations.server";
import { getInvocationLogs } from "../logs.server";

// --- Test helpers: fake providers assembled into Deps ---

function fakeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    functions: { listFunctions: vi.fn() },
    logs: {
      fetchInvocationReconstructionEvents: vi.fn(),
      fetchInvocationEvents: vi.fn(),
    },
    identity: { getCallerIdentity: vi.fn() },
    region: "ca-central-1",
    profile: "test-profile",
    ...overrides,
  };
}

// --- listFunctions ---

describe("listFunctions", () => {
  it("sorts the functions by name", async () => {
    const functions: FunctionProvider = {
      listFunctions: vi.fn().mockResolvedValue([
        {
          name: "zeta",
          runtime: "nodejs",
          lastModified: null,
          description: "",
          memorySize: null,
          timeout: null,
        },
        {
          name: "alpha",
          runtime: "nodejs",
          lastModified: null,
          description: "",
          memorySize: null,
          timeout: null,
        },
      ] satisfies LambdaFunction[]),
    };
    const result = await listFunctions(fakeDeps({ functions }));
    expect(result.map((f) => f.name)).toEqual(["alpha", "zeta"]);
  });
});

// --- listInvocations ---

describe("listInvocations", () => {
  it("fetches invocations without a count limit", async () => {
    const events: RawLogEvent[] = [
      { timestamp: 1, message: "START RequestId: abc-111" },
      { timestamp: 2, message: "END RequestId: abc-111" },
    ];
    const logs: LogProvider = {
      fetchInvocationReconstructionEvents: vi.fn().mockResolvedValue(events),
      fetchInvocationEvents: vi.fn(),
    };
    const result = await listInvocations(fakeDeps({ logs }), "fn");
    expect(logs.fetchInvocationReconstructionEvents).toHaveBeenCalledWith("fn", {});
    expect(result).toHaveLength(1);
    expect(result[0]!.requestId).toBe("abc-111");
  });

  it("passes through the time range", async () => {
    const logs: LogProvider = {
      fetchInvocationReconstructionEvents: vi.fn().mockResolvedValue([]),
      fetchInvocationEvents: vi.fn(),
    };
    await listInvocations(fakeDeps({ logs }), "fn", {
      startTime: 1000,
      endTime: 2000,
    });
    expect(logs.fetchInvocationReconstructionEvents).toHaveBeenCalledWith("fn", {
      startTime: 1000,
      endTime: 2000,
    });
  });
});

// --- getInvocationLogs ---

describe("getInvocationLogs", () => {
  it("maps events to LogLine and passes through the query", async () => {
    const events: RawLogEvent[] = [
      { timestamp: 2, message: "line r1 b" },
      { timestamp: 1, message: "line r1 a" },
    ];
    const logs: LogProvider = {
      fetchInvocationReconstructionEvents: vi.fn(),
      fetchInvocationEvents: vi.fn().mockResolvedValue(events),
    };
    const query = { startTime: 100, logStreamName: "s" };
    const result = await getInvocationLogs(fakeDeps({ logs }), "fn", "r1", query);
    expect(logs.fetchInvocationEvents).toHaveBeenCalledWith("fn", "r1", query);
    // Sorted by ascending timestamp, and shaped as {timestamp, message}.
    expect(result).toEqual([
      { timestamp: 1, message: "line r1 a" },
      { timestamp: 2, message: "line r1 b" },
    ]);
  });
});

// --- getCallerIdentity ---

describe("getCallerIdentity", () => {
  const identity = (accountId: string | null): IdentityProvider => ({
    getCallerIdentity: vi.fn().mockResolvedValue({ accountId, arn: "arn:test" }),
  });

  it("resolves the account and ARN from the active profile", async () => {
    const result = await getCallerIdentity(fakeDeps({ identity: identity("111") }));
    expect(result).toEqual({ accountId: "111", arn: "arn:test" });
  });
});
