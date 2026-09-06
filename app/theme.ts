// Central Mantine theme. This is the single source of visual truth for the app:
// accent color, radii, mono font and default component sizing all live here so
// the look stays consistent without per-component overrides.
//
// The accent is the official AWS Lambda orange (#ED7100), matching the logo /
// favicon, so actionable elements (buttons, focus rings, active states) read as
// "Lambda". State colors (red / green / blue) are intentionally left to Mantine
// defaults and used sparingly as signals, not decoration.

import { type MantineColorsTuple, createTheme } from "@mantine/core";

// A 10-shade tuple built around the Lambda orange. Index 6 is the base accent.
const lambda: MantineColorsTuple = [
  "#fff4e6",
  "#ffe8cc",
  "#ffd8a8",
  "#ffc078",
  "#ffa94d",
  "#ff922b",
  "#ed7100", // base — the Lambda orange
  "#d15f00",
  "#b35000",
  "#8f3f00",
];

export const theme = createTheme({
  primaryColor: "lambda",
  primaryShade: { light: 6, dark: 6 },
  colors: { lambda },

  defaultRadius: "md",
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',

  // Slightly tighter default heading scale for a dense, tool-like feel.
  headings: {
    sizes: {
      h1: { fontSize: "1.5rem" },
      h2: { fontSize: "1.25rem" },
      h3: { fontSize: "1.05rem" },
      h4: { fontSize: "0.95rem" },
    },
  },

  components: {
    // Inputs and controls default to a compact size across the app.
    TextInput: { defaultProps: { size: "sm" } },
    Select: { defaultProps: { size: "sm" } },
    Button: { defaultProps: { size: "sm" } },
    Table: { defaultProps: { verticalSpacing: "xs", horizontalSpacing: "md" } },
  },
});
