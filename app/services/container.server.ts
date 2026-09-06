// Composition root (server-only): the only place that wires the concrete AWS
// providers to the application services (dependency injection). The rest of the
// code depends on the provider interfaces via the `Deps` object.
//
// The app targets a SINGLE set of AWS credentials, resolved once at startup, in
// this order of precedence:
//   1. Static credentials already in the environment (AWS_ACCESS_KEY_ID + secret,
//      e.g. injected by aws-vault) — these WIN, even if AWS_PROFILE is also set,
//      because that is what the launching shell is actually authenticated with.
//   2. Otherwise, AWS_PROFILE selects a named profile from ~/.aws.
//   3. Otherwise, the standard provider chain (shared config default, SSO, …).
// There is no per-request profile switching anymore, so the built `Deps` are
// memoized once for the whole process.

import { loadEnv } from "~/config/env.server";
import type { FunctionProvider, IdentityProvider, LogProvider } from "~/domain/ports";
import { createAwsClients } from "~/infra/aws/clients.server";
import { CloudWatchLogProvider } from "~/infra/aws/cloudwatch.provider.server";
import { LambdaFunctionProvider } from "~/infra/aws/lambda.provider.server";
import { StsIdentityProvider } from "~/infra/aws/sts.provider.server";

/** Provider interfaces injected into the application services. */
export interface Deps {
  readonly functions: FunctionProvider;
  readonly logs: LogProvider;
  readonly identity: IdentityProvider;
  /** Region actually used (override, profile region, env, or default). */
  readonly region: string;
  /** The profile name in use, or null when credentials come from the env. */
  readonly profile: string | null;
}

// The startup credentials never change during the process lifetime, so the Deps
// are built once and memoized.
let depsPromise: Promise<Deps> | undefined;

/** Builds the concrete providers from the startup profile/credentials. */
async function buildDeps(): Promise<Deps> {
  const { defaultProfileEnv, hasEnvCredentials, regionOverride } = loadEnv();

  // When static credentials are already in the environment (aws-vault, CI, …),
  // do NOT pin a profile: forcing fromIni({ profile }) would make the SDK look
  // the profile up in ~/.aws and ignore the working env credentials. Passing
  // null lets the provider chain use the env credentials directly.
  const profileForCredentials = hasEnvCredentials ? null : defaultProfileEnv;

  const clients = await createAwsClients(profileForCredentials, regionOverride, {
    // aws-vault / CI: env static credentials must win over AWS_PROFILE.
    preferEnvCredentials: hasEnvCredentials,
    // Still use the profile name to look up its region in ~/.aws/config.
    regionProfile: defaultProfileEnv,
  });

  // For display: keep the profile name if aws-vault exposed one, even though the
  // credentials themselves come from the environment.
  const displayProfile = defaultProfileEnv;

  return {
    functions: new LambdaFunctionProvider(clients.lambda),
    logs: new CloudWatchLogProvider(clients.logs),
    identity: new StsIdentityProvider(clients.sts),
    region: clients.region,
    profile: displayProfile,
  };
}

/** Resolves (and caches) the injected Deps for the whole process. */
export function getDeps(): Promise<Deps> {
  if (!depsPromise) {
    depsPromise = buildDeps();
  }
  return depsPromise;
}
