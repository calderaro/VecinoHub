"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function AppNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.nav");
  const navLinks = [
    { href: `${basePath}`, label: t("dashboard"), testId: "nav-dashboard" },
    {
      href: `${basePath}/members`,
      label: t("members"),
      testId: "nav-members",
    },
    { href: `${basePath}/polls`, label: t("polls"), testId: "nav-polls" },
    {
      href: `${basePath}/fundraising`,
      label: t("fundraising"),
      testId: "nav-fundraising",
    },
    { href: `${basePath}/fund`, label: t("funds"), testId: "nav-funds" },
    { href: `${basePath}/resources`, label: t("resources"), testId: "nav-resources" },
    { href: `${basePath}/events`, label: t("events"), testId: "nav-events" },
    { href: `${basePath}/posts`, label: t("posts"), testId: "nav-posts" },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            data-testid={link.testId}
            className={
              isActive
                ? "text-[color:var(--accent)]"
                : "transition hover:text-[color:var(--accent-strong)]"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
