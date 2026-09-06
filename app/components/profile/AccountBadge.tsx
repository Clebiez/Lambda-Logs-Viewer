// Read-only account indicator shown in the header. With profile selection
// removed, this just surfaces which AWS account/region the app is scoped to
// (resolved once at startup from AWS_PROFILE or the shell's credentials). It
// fetches its own data via useMeta and renders nothing intrusive while loading.
//
// Client-safe: no .server imports, no AWS SDK.

import { Loader, Stack, Text, Tooltip } from "@mantine/core";
import { useMeta } from "~/query/hooks";

/** Renders the resolved account id + region, or a discreet error. */
export function AccountBadge() {
  const { data: meta } = useMeta();

  if (!meta) return <Loader size="xs" />;

  const identity = meta.identity;
  const account =
    identity && "accountId" in identity && identity.accountId ? identity.accountId : null;
  const errorMsg = identity && "message" in identity ? identity.message : undefined;

  const profileLabel = meta.profile ? meta.profile : "shell credentials";

  if (errorMsg) {
    return (
      <Tooltip label={errorMsg} multiline w={320}>
        <Stack gap={0} align="flex-end">
          <Text size="sm" fw={600} lh={1.1} c="red">
            {meta.region} · error
          </Text>
          <Text size="xs" c="dimmed" lh={1.1}>
            {profileLabel}
          </Text>
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={`Account ${account ?? "?"} · ${meta.region} · ${profileLabel}`}>
      <Stack gap={0} align="flex-end">
        <Text size="sm" fw={600} lh={1.1}>
          {account ?? "—"}
        </Text>
        <Text size="xs" c="dimmed" lh={1.1}>
          {meta.region}
        </Text>
      </Stack>
    </Tooltip>
  );
}
