#!/usr/bin/env node

// CLI entry point for `npx lambda-logs-viewer` / a global install.
//
// This is a React Router (framework mode) app: at runtime it needs its
// production build (build/server/index.js + build/client/) and the
// `react-router-serve` production server. Both are shipped in the published
// package (see "files" and "prepublishOnly" in package.json).
//
// We launch react-router-serve as a child process with:
//   - the absolute path to THIS package's server build, so it works regardless
//     of the user's current working directory, and
//   - cwd set to the package root, because react-router-serve serves the
//     `public/` directory (favicon, …) relative to the working directory.
//
// AWS credentials / AWS_PROFILE / AWS_REGION / PORT are read from the
// environment the user launched us with (e.g. `AWS_PROFILE=x npx …` or
// `aws-vault exec x -- npx …`), so we just pass the environment through.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const serverBuild = join(packageRoot, "build", "server", "index.js");

// Resolve the react-router-serve CLI from our own dependencies.
const require = createRequire(import.meta.url);
let serveBin;
try {
  const servePkg = require.resolve("@react-router/serve/package.json");
  serveBin = join(dirname(servePkg), "bin.js");
} catch {
  console.error(
    "lambda-logs-viewer: could not locate @react-router/serve. Try reinstalling the package.",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [serveBin, serverBuild], {
  cwd: packageRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("lambda-logs-viewer: failed to start the server.", err);
  process.exit(1);
});
