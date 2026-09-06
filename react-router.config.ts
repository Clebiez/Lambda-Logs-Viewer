import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default so route loaders run on the server and AWS
  // SDK calls never reach the browser bundle (see requirements R1, R2).
  ssr: true,
  appDirectory: "app",
} satisfies Config;
