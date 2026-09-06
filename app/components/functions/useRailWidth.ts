// Persisted, draggable width for the functions rail. The width is stored in
// localStorage so the user's choice survives reloads, and clamped to a sensible
// range. `startResize` wires up a pointer drag that updates the width live.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "railWidth";
const RAIL_MIN_WIDTH = 220;
const RAIL_MAX_WIDTH = 560;
const RAIL_DEFAULT_WIDTH = 320;

function clamp(value: number): number {
  return Math.max(RAIL_MIN_WIDTH, Math.min(RAIL_MAX_WIDTH, value));
}

function readStored(): number {
  if (typeof window === "undefined") return RAIL_DEFAULT_WIDTH;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? clamp(n) : RAIL_DEFAULT_WIDTH;
}

export interface RailWidth {
  /** Current rail width in px. */
  readonly width: number;
  /** Begin a drag-resize from the current pointer position. */
  readonly startResize: (e: React.PointerEvent) => void;
  /** Keyboard resize: left/right arrows nudge the width by a step. */
  readonly nudgeResize: (e: React.KeyboardEvent) => void;
  /** True while a drag is in progress (for styling the handle). */
  readonly resizing: boolean;
}

export function useRailWidth(): RailWidth {
  // Start from the SSR default to keep the server/client markup identical, then
  // adopt the stored value after mount to avoid a hydration mismatch.
  const [width, setWidth] = useState(RAIL_DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    setWidth(readStored());
  }, []);

  // Persist whenever the width settles.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(width));
    }
  }, [width]);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);

    const onMove = (ev: PointerEvent) => {
      // The rail starts at the viewport's left edge, so the pointer X is the width.
      setWidth(clamp(ev.clientX));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    // Keep a consistent resize cursor and avoid selecting text while dragging.
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const nudgeResize = useCallback((e: React.KeyboardEvent) => {
    const STEP = 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth((w) => clamp(w - STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setWidth((w) => clamp(w + STEP));
    }
  }, []);

  return { width, startResize, nudgeResize, resizing };
}
