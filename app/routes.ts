import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Page routes render the UI (SSR via loaders). Resource routes return JSON and
// exist to serve client-side react-query refetch (task 6). Their paths mirror
// the old Express `/api/*` endpoints so the query hooks can fetch them.
export default [
  // Page routes
  index("routes/home.tsx"),
  route("functions/:name", "routes/invocations.tsx"),
  route("functions/:name/invocations/:requestId", "routes/logs.tsx"),

  // Resource routes (JSON), mirroring the previous API paths.
  route("api/functions", "routes/api.functions.ts"),
  route("api/functions/:name/invocations", "routes/api.invocations.ts"),
  route("api/functions/:name/invocations/:requestId/logs", "routes/api.logs.ts"),
  route("api/meta", "routes/api.meta.ts"),
] satisfies RouteConfig;
