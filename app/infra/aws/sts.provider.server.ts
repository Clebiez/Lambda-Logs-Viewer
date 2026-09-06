// Provider: implements IdentityProvider via STS (GetCallerIdentity).
// Server-only.

import { GetCallerIdentityCommand, type STSClient } from "@aws-sdk/client-sts";
import type { CallerIdentity } from "~/domain/entities";
import type { IdentityProvider } from "~/domain/ports";

export class StsIdentityProvider implements IdentityProvider {
  constructor(private readonly client: STSClient) {}

  async getCallerIdentity(): Promise<Pick<CallerIdentity, "accountId" | "arn">> {
    const resp = await this.client.send(new GetCallerIdentityCommand({}));
    return { accountId: resp.Account ?? null, arn: resp.Arn ?? null };
  }
}
