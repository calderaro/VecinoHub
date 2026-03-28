"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import type { HelpScreenKey } from "@/lib/help-content";
import { trpc } from "@/lib/trpc";

type HelpViewTrackerProps = {
  eventName: "help_center_opened" | "help_article_opened";
  articleSlug?: string;
  screenKey?: HelpScreenKey;
  source?: string;
};

export function HelpViewTracker({
  eventName,
  articleSlug,
  screenKey,
  source,
}: HelpViewTrackerProps) {
  const locale = useLocale();
  const recordEvent = trpc.help.recordEvent.useMutation();

  useEffect(() => {
    recordEvent.mutate({
      eventName,
      locale: locale === "en" ? "en" : "es",
      articleSlug,
      screenKey,
      source,
    });
  }, [articleSlug, eventName, locale, recordEvent, screenKey, source]);

  return null;
}
