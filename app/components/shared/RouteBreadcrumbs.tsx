// Reusable breadcrumbs trail. Presentational: the caller builds each crumb's
// `to` target (including any URL search state), so this component never reads
// the URL itself. It may import `Link` because breadcrumbs are inherently
// navigational — but it derives no state from the router.
//
// The last crumb (the one without a `to`) renders as plain text to mark the
// current location; every other crumb renders as an anchor.

import { Anchor, Breadcrumbs, Text } from "@mantine/core";
import { Link } from "react-router";

/** A single breadcrumb. Omit `to` for the current (last) crumb. */
export interface Crumb {
  readonly label: string;
  readonly to?: { pathname: string; search?: string };
}

interface RouteBreadcrumbsProps {
  readonly crumbs: readonly Crumb[];
}

/** Renders a breadcrumb trail from caller-built crumb targets. */
export function RouteBreadcrumbs({ crumbs }: RouteBreadcrumbsProps) {
  return (
    <Breadcrumbs>
      {crumbs.map((crumb) =>
        crumb.to ? (
          <Anchor key={crumb.label} component={Link} to={crumb.to}>
            {crumb.label}
          </Anchor>
        ) : (
          <Text key={crumb.label}>{crumb.label}</Text>
        ),
      )}
    </Breadcrumbs>
  );
}
