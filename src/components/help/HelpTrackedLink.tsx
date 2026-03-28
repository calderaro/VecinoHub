"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

import type { HelpScreenKey } from "@/lib/help-content";
import { trpc } from "@/lib/trpc";

type HelpTrackedEventName =
  | "help_article_cta_clicked"
  | "help_context_article_clicked";

type HelpTrackedLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  articleSlug?: string;
  screenKey?: HelpScreenKey;
  source?: string;
  eventName?: HelpTrackedEventName;
  appendHelpSource?: string;
  dataTestId?: string;
  onClick?: () => void;
};

function buildHref(href: string, appendHelpSource?: string) {
  if (!appendHelpSource) {
    return href;
  }

  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("source", appendHelpSource);
  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function HelpTrackedLink({
  href,
  children,
  className,
  articleSlug,
  screenKey,
  source,
  eventName,
  appendHelpSource,
  dataTestId,
  onClick,
}: HelpTrackedLinkProps) {
  const locale = useLocale();
  const recordEvent = trpc.help.recordEvent.useMutation();
  const resolvedHref = buildHref(href, appendHelpSource);

  return (
    <Link
      href={resolvedHref}
      className={className}
      data-testid={dataTestId}
      onClick={() => {
        onClick?.();

        if (!eventName) {
          return;
        }

        recordEvent.mutate({
          eventName,
          locale: locale === "en" ? "en" : "es",
          articleSlug,
          screenKey,
          source,
        });
      }}
    >
      {children}
    </Link>
  );
}
