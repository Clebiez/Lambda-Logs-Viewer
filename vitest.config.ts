import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Dedicated vitest config: it does NOT load the React Router Vite plugin (which
// is meant for the app build/dev server), only tsconfig path resolution so the
// `~/*` alias works in tests. Build output is excluded.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    exclude: ["build/**", "node_modules/**", ".react-router/**"],
  },
});
