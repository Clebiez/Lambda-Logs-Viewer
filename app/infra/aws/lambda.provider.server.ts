// Provider: implements FunctionProvider via the Lambda API (ListFunctions).
// Server-only.

import { type LambdaClient, paginateListFunctions } from "@aws-sdk/client-lambda";
import type { LambdaFunction } from "~/domain/entities";
import type { FunctionProvider } from "~/domain/ports";

export class LambdaFunctionProvider implements FunctionProvider {
  constructor(private readonly client: LambdaClient) {}

  async listFunctions(): Promise<LambdaFunction[]> {
    const functions: LambdaFunction[] = [];
    const paginator = paginateListFunctions({ client: this.client }, {});

    for await (const page of paginator) {
      for (const fn of page.Functions ?? []) {
        functions.push({
          name: fn.FunctionName ?? "(no name)",
          runtime: fn.Runtime ?? "-",
          lastModified: fn.LastModified ?? null,
          description: fn.Description ?? "",
          memorySize: fn.MemorySize ?? null,
          timeout: fn.Timeout ?? null,
        });
      }
    }

    return functions;
  }
}
