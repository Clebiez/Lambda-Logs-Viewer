import "@mantine/core/styles.css";
import "~/styles.css";

import {
  AppShell,
  Button,
  Center,
  ColorSchemeScript,
  Group,
  MantineProvider,
  Paper,
  Stack,
  Text,
  Title,
  mantineHtmlProps,
} from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { FunctionRail } from "~/components/functions/FunctionRail";
import { useRailWidth } from "~/components/functions/useRailWidth";
import { AccountBadge } from "~/components/profile/AccountBadge";
import { LambdaLogo } from "~/components/shared/LambdaLogo";
import { getQueryClient } from "~/query/client-instance";
import { theme } from "~/theme";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const queryClient = getQueryClient();
  const { width, startResize, nudgeResize, resizing } = useRailWidth();

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <AppShell header={{ height: 56 }} navbar={{ width, breakpoint: "sm" }} padding="md">
          <AppShell.Header>
            <Group h="100%" px="md" gap="sm" wrap="nowrap">
              <Link to="/" style={{ textDecoration: "none", color: "inherit" }} aria-label="Home">
                <Group gap="xs" wrap="nowrap">
                  <LambdaLogo size={28} />
                  <Title order={5} fw={600}>
                    Lambda Logs Viewer
                  </Title>
                </Group>
              </Link>
              <Group ml="auto" gap="md" wrap="nowrap">
                <AccountBadge />
              </Group>
            </Group>
          </AppShell.Header>

          <AppShell.Navbar>
            <FunctionRail />
            {/* Drag handle on the rail's right edge to resize it. */}
            <div
              className="rail-resize-handle"
              data-resizing={resizing || undefined}
              onPointerDown={startResize}
              onKeyDown={nudgeResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize functions panel"
              tabIndex={0}
            />
          </AppShell.Navbar>

          <AppShell.Main>
            <Outlet />
          </AppShell.Main>
        </AppShell>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </MantineProvider>
  );
}

/**
 * Root error boundary. Catches anything that escapes a route (thrown route
 * responses, loader/render errors) and renders a calm, on-brand error page
 * instead of React Router's default white "Application Error" screen.
 *
 * It brings its own MantineProvider because it renders OUTSIDE the <App> tree
 * (where the provider normally lives), so Mantine components still get a theme.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "An unexpected error occurred while rendering this page.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    message = error.statusText || error.data?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Center mih="100vh" p="md">
        <Paper role="alert" py={48} px="xl" withBorder radius="md">
          <Stack align="center" gap="sm" maw={460} mx="auto" ta="center">
            <Text fz="lg" fw={600}>
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {message}
            </Text>
            <Button component="a" href="/" variant="default" size="xs" mt="xs">
              Back to home
            </Button>
          </Stack>
        </Paper>
      </Center>
    </MantineProvider>
  );
}
