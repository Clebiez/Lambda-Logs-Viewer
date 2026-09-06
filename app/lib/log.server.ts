// Minimal server-side logger. The app deliberately maps thrown errors into
// clean JSON payloads for the UI (see error-mapping), which means the ORIGINAL
// exception (stack, AWS error name, cause) would otherwise never be printed.
// This logs the full error to the server console so failures are diagnosable
// from the terminal running `npm run dev`.
//
// Server-only (`.server.ts`): never bundled for the browser.

/** Logs a server-side error with its full stack and any nested cause. */
export function logServerError(context: string, err: unknown): void {
  // Print the Error object itself so Node renders the name, message and stack.
  console.error(`[server] ${context}:`, err);

  // Surface a nested cause when present (AWS SDK often wraps the real error).
  if (err instanceof Error && err.cause !== undefined) {
    console.error(`[server] ${context} (cause):`, err.cause);
  }
}
