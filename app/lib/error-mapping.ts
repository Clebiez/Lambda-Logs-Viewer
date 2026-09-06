// Translates an error (AWS or domain) into a readable, serializable shape that
// route loaders return on failure and the UI renders (via QueryState). Ported
// from the backend HTTP error-mapping; the status/hint heuristics are unchanged.

/** Flattened error shape returned by loaders and rendered by the UI. */
export interface MappedError {
  readonly status: number;
  readonly error: string;
  readonly message: string;
  readonly hint?: string;
}

/** Maps an error to a meaningful HTTP status + a readable, flat payload. */
export function mapError(err: unknown): MappedError {
  const name = err instanceof Error ? err.name : "Error";
  const message = err instanceof Error ? err.message : "Unknown error";
  const hint = hintForError(name);
  const status = statusForError(name);
  return hint ? { status, error: name, message, hint } : { status, error: name, message };
}

function statusForError(name: string): number {
  if (name.includes("ResourceNotFound")) return 404;
  if (name.includes("AccessDenied") || name.includes("AuthorizationError")) return 403;
  if (
    name.includes("CredentialsProviderError") ||
    name.includes("UnrecognizedClient") ||
    name.includes("ExpiredToken") ||
    name.includes("InvalidSignature")
  ) {
    return 401;
  }
  if (name.includes("Throttling") || name.includes("TooManyRequests") || name.includes("Rate")) {
    return 429;
  }
  // Any other AWS-side/service error → 502 (bad upstream), else generic 500.
  return 500;
}

function hintForError(name: string): string | undefined {
  // Expired session: the credentials WERE valid but the STS token lapsed.
  // Static env credentials (aws-vault exec, CI) can't be refreshed in-process,
  // so the fix is to restart with a fresh session.
  if (name.includes("ExpiredToken")) {
    return "Your AWS session has expired. Refresh it and restart the app.";
  }
  if (name.includes("CredentialsProviderError") || name.includes("UnrecognizedClient")) {
    return "AWS credentials are missing or invalid. Launch the app with credentials.";
  }
  if (name.includes("AccessDenied") || name.includes("AuthorizationError")) {
    return "Insufficient IAM permissions (lambda:ListFunctions, logs:FilterLogEvents, logs:GetLogEvents, sts:GetCallerIdentity).";
  }
  if (name.includes("ResourceNotFound")) {
    return "The log group does not exist: the Lambda may never have been invoked.";
  }
  if (name.includes("Throttling") || name.includes("Rate")) {
    return "CloudWatch throttled the request (5 TPS on FilterLogEvents). Try again or use a shorter time range.";
  }
  return undefined;
}
