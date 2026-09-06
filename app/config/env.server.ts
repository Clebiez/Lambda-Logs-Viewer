// Server-only environment configuration (dotenv). This is an infrastructure
// concern (a technical detail), not part of the domain.
//
// AWS_PROFILE is OPTIONAL: when set, the app is scoped to that named profile;
// when unset, the AWS provider chain falls back to whatever credentials the
// launching shell is logged into (AWS_ACCESS_KEY_ID / SESSION_TOKEN / SSO / …).
// AWS_REGION and PORT are optional.
//

import dotenv from "dotenv";

// Load .env from the current working directory (repo root). Existing process
// env values are not overwritten.
dotenv.config();

const env = (key: string): string | undefined => {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

export interface AppEnv {
  /**
   * The AWS profile from the environment (AWS_PROFILE), if set. When null, the
   * provider chain resolves credentials from the shell environment instead.
   */
  readonly defaultProfileEnv: string | null;
  /**
   * True when static credentials are already present in the environment
   * (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY, e.g. injected by aws-vault). In
   * that case they take precedence over any AWS_PROFILE name.
   */
  readonly hasEnvCredentials: boolean;
  /** Optional region override. If absent, the profile's own region is used. */
  readonly regionOverride: string | null;
  /** HTTP port for the server (defaults to 3000). */
  readonly port: number;
}

export function loadEnv(): AppEnv {
  return {
    defaultProfileEnv: env("AWS_PROFILE") ?? null,
    hasEnvCredentials: Boolean(env("AWS_ACCESS_KEY_ID") && env("AWS_SECRET_ACCESS_KEY")),
    regionOverride: env("AWS_REGION") ?? null,
    port: Number(env("PORT")) || 3000,
  };
}
