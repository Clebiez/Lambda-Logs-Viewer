// Home route ("/"): with the persistent functions rail now living in the app
// shell (root.tsx), the home page no longer lists functions. It shows a calm
// empty/onboarding state — UNLESS loading the functions failed (e.g. an expired
// AWS session), in which case it surfaces that error centrally via ErrorState,
// so the failure isn't silently hidden behind "Pick a function to start".
//
// It reads useFunctions() (the same cache entry the rail uses, so no extra
// fetch) purely to know whether to show onboarding or the error.

import { Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { ErrorState } from "~/components/shared/ErrorState";
import { LambdaLogo } from "~/components/shared/LambdaLogo";
import { useFunctions } from "~/query/hooks";

export function meta() {
  return [{ title: "Lambda Logs Viewer" }];
}

export default function Home() {
  const query = useFunctions();

  // Only surface the error once there's no data to fall back on, mirroring the
  // QueryState convention used elsewhere.
  if (query.error && query.data == null) {
    return (
      <Center mih="70vh">
        <div style={{ width: "100%", maxWidth: 520 }}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      </Center>
    );
  }

  return (
    <Center mih="70vh">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon variant="transparent" size={56} radius="md">
          <LambdaLogo size={48} />
        </ThemeIcon>
        <Text fz="lg" fw={600}>
          Pick a function to start
        </Text>
        <Text size="sm" c="dimmed">
          Choose a Lambda from the list on the left to see its recent invocations and drill into
          their CloudWatch logs.
        </Text>
      </Stack>
    </Center>
  );
}
