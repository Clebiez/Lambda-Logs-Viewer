// Refined, human-friendly error state. Replaces the raw red Alert previously
// rendered by QueryState: instead of dumping a technical error name
// (e.g. "ResourceNotFoundException") into an aggressive alert, it presents a
// calm, centered state with a humanized title, the underlying message, an
// optional actionable hint, and an unobtrusive "Retry" action.
//
// Presentational only: it maps an unknown error to a readable shape and renders
// it. It never fetches or touches the router; the caller decides what "retry"
// does.

import { Button, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { ApiError } from "~/query/client";

interface ErrorStateProps {
  readonly error: unknown;
  /** Optional retry handler. When provided, a subtle "Retry" button is shown. */
  readonly onRetry?: () => void;
}

interface ErrorView {
  readonly title: string;
  readonly message: string;
  readonly hint?: string;
  /** Accent tone: "muted" for expected/not-found, "alert" for real failures. */
  readonly tone: "muted" | "alert";
}

/**
 * Maps a raw error to a readable view. The heuristics mirror the server-side
 * error mapping (lib/error-mapping): auth / permission / not-found / throttling
 * get a friendly title and a calm tone; unknown failures fall back to "alert".
 */
function toErrorView(error: unknown): ErrorView {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  const hint = error instanceof ApiError ? error.hint : undefined;

  if (name.includes("ResourceNotFound") || name.includes("404")) {
    return {
      title: "Nothing to show here",
      message,
      hint,
      tone: "muted",
    };
  }
  if (name.includes("AccessDenied") || name.includes("Authorization") || name.includes("403")) {
    return { title: "Access denied", message, hint, tone: "alert" };
  }
  if (name.includes("ExpiredToken")) {
    return { title: "Session expired", message, hint, tone: "alert" };
  }
  if (name.includes("Credentials") || name.includes("UnrecognizedClient") || name.includes("401")) {
    return { title: "Not authenticated", message, hint, tone: "alert" };
  }
  if (name.includes("Throttling") || name.includes("Rate") || name.includes("429")) {
    return { title: "Too many requests", message, hint, tone: "muted" };
  }
  if (name === "NetworkError") {
    return { title: "Can’t reach the server", message, hint, tone: "alert" };
  }
  return { title: "Something went wrong", message, hint, tone: "alert" };
}

/** Minimal inline glyph — avoids pulling in an icon dependency. */
function ErrorGlyph({ tone }: { tone: ErrorView["tone"] }) {
  return (
    <ThemeIcon
      variant="light"
      color={tone === "alert" ? "red" : "gray"}
      size={44}
      radius="xl"
      aria-hidden
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="presentation"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12.5" />
        <line x1="12" y1="16" x2="12" y2="16" />
      </svg>
    </ThemeIcon>
  );
}

/** Calm, centered error state with an optional retry action. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const view = toErrorView(error);

  return (
    <Paper role="alert" py={48} px="xl" withBorder radius="md">
      <Stack align="center" gap="sm" maw={440} mx="auto" ta="center">
        <ErrorGlyph tone={view.tone} />

        <Text fz="lg" fw={600}>
          {view.title}
        </Text>

        <Text size="sm" c="dimmed">
          {view.message}
        </Text>

        {view.hint ? (
          <Text size="xs" c="dimmed" style={{ opacity: 0.75 }}>
            {view.hint}
          </Text>
        ) : null}

        {onRetry ? (
          <Button variant="default" size="xs" mt="xs" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
