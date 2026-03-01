import { notFound } from "next/navigation";

const supportedLanguages = ["en"] as const;

type SupportedLanguage = (typeof supportedLanguages)[number];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(lang);
}

export default async function LocalizedLegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);

  if (!isSupportedLanguage(resolvedParams.lang)) {
    notFound();
  }

  return children;
}
