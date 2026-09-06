// Persistent left rail: the searchable list of Lambda functions, always visible
// so switching functions never reloads the whole page or loses context. It owns
// its own data (useFunctions) and reads the active function from the URL; the
// route content on the right reacts to the selection.
//
// Presentational-with-data: it fetches functions and navigates, but the heavy
// UI (rows) is delegated to FunctionRailItem. State (search text) is local.

import { ActionIcon, Box, Loader, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FunctionRailItem } from "~/components/functions/FunctionRailItem";
import type { LambdaFunction } from "~/domain/entities";
import { useFunctions } from "~/query/hooks";

/** The always-visible functions rail (navbar). */
export function FunctionRail() {
  const navigate = useNavigate();
  const { name: activeName } = useParams<{ name: string }>();
  const [filter, setFilter] = useState("");
  const query = useFunctions();

  const functions: LambdaFunction[] = query.data?.functions ?? [];

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return term ? functions.filter((f) => f.name.toLowerCase().includes(term)) : functions;
  }, [functions, filter]);

  return (
    <Stack gap={0} h="100%">
      <Box p="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <TextInput
          size="sm"
          placeholder="Filter functions…"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          rightSection={
            filter ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
              >
                ×
              </ActionIcon>
            ) : null
          }
        />
        <Text size="xs" c="dimmed" mt="xs" px={4}>
          {query.isLoading
            ? "Loading…"
            : filter
              ? `${filtered.length} of ${functions.length}`
              : `${functions.length} functions`}
        </Text>
      </Box>

      <ScrollArea type="hover" style={{ flex: 1 }}>
        {query.isLoading ? (
          <Box p="md" ta="center">
            <Loader size="sm" />
          </Box>
        ) : filtered.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" p="md">
            No matching function.
          </Text>
        ) : (
          <Stack gap={4} p="xs">
            {filtered.map((fn) => (
              <FunctionRailItem
                key={fn.name}
                fn={fn}
                filter={filter}
                active={fn.name === activeName}
                onClick={() => navigate(`/functions/${encodeURIComponent(fn.name)}`)}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}
