// Server-only helper shared by resource routes: returns the effective AWS
// scope (the injected Deps). The profile/credentials are resolved once at
// startup from the environment (AWS_PROFILE, or the shell's AWS_* credentials),
// NOT from the request URL — the app runs against a single account.

import { type Deps, getDeps } from "./container.server";

/** Resolved scope: the injected Deps plus the profile name (null when env-based). */
export interface ResolvedScope {
  readonly profile: string | null;
  readonly deps: Deps;
}

/**
 * Returns the process-wide scope. Throws a readable error when no AWS
 * credentials can be resolved at all (no profile and no ambient credentials).
 */
export async function resolveScope(): Promise<ResolvedScope> {
  const deps = await getDeps();
  return { profile: deps.profile, deps };
}
