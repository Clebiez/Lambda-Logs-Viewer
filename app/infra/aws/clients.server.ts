// Builds the AWS SDK v3 clients used across the app. Credentials are resolved by
// the standard AWS provider chain (fromNodeProviderChain):
//   - when a named profile is given, they are read from ~/.aws (config /
//     credentials) for that profile;
//   - when no profile is given, the chain falls back to the shell environment
//     (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN), SSO, etc.
// This lets the app run either against a named profile OR against whatever
// credentials the launching shell is already logged into.
//
// Server-only (`.server.ts`): the AWS SDK never reaches the client bundle.

import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { STSClient } from "@aws-sdk/client-sts";
import { fromEnv, fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";

const DEFAULT_REGION = "ca-central-1";

export interface AwsClients {
  readonly lambda: LambdaClient;
  readonly logs: CloudWatchLogsClient;
  readonly sts: STSClient;
  /** Region actually used (override or resolved from the profile). */
  readonly region: string;
}

/**
 * Resolves the region. Order: explicit override → the named profile's region in
 * ~/.aws/config (when a profile is given) → AWS_REGION / AWS_DEFAULT_REGION from
 * the environment → the built-in default.
 */
async function resolveRegion(profile: string | null, override: string | null): Promise<string> {
  if (override) return override;
  if (profile) {
    try {
      const shared = await loadSharedConfigFiles();
      const profileConfig = shared.configFile?.[profile];
      if (profileConfig?.region) return profileConfig.region;
    } catch {
      // ignore and fall back
    }
  }
  const envRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (envRegion && envRegion.trim() !== "") return envRegion.trim();
  return DEFAULT_REGION;
}

/**
 * Builds the AWS clients.
 *
 * Credential resolution:
 *   - `preferEnvCredentials` true → use fromEnv() exclusively. This is required
 *     for aws-vault: the SDK's default chain reads process.env.AWS_PROFILE even
 *     when no profile is passed and PREFERS it over the static env credentials,
 *     so if that profile isn't resolvable the whole chain fails. fromEnv() reads
 *     only AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN.
 *   - otherwise, a named `profile` pins fromIni via the node chain, and when
 *     null the standard chain applies (shared config default, SSO, …).
 */
export async function createAwsClients(
  profile: string | null,
  regionOverride: string | null = null,
  options: {
    /** Prefer the static credentials in the environment (aws-vault / CI). */
    readonly preferEnvCredentials?: boolean;
    /** Profile name used ONLY to look up a region in ~/.aws/config. */
    readonly regionProfile?: string | null;
  } = {},
): Promise<AwsClients> {
  const { preferEnvCredentials = false, regionProfile = profile } = options;

  const credentials = preferEnvCredentials
    ? fromEnv()
    : fromNodeProviderChain(profile ? { profile } : {});
  const region = await resolveRegion(regionProfile, regionOverride);
  const clientOptions = { region, credentials };

  return {
    lambda: new LambdaClient(clientOptions),
    logs: new CloudWatchLogsClient(clientOptions),
    sts: new STSClient(clientOptions),
    region,
  };
}
