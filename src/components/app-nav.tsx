"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function AppNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.nav");
  const navLinks = [
    { href: `${basePath}`, label: t("dashboard") },
    { href: `${basePath}/members`, label: t("members") },
    { href: `${basePath}/polls`, label: t("polls") },
    { href: `${basePath}/fundraising`, label: t("fundraising") },
    { href: `${basePath}/events`, label: t("events") },
    { href: `${basePath}/posts`, label: t("posts") },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
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
