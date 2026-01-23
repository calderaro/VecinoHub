"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const navLinks = [
    { href: `${basePath}`, label: "Dashboard" },
    { href: `${basePath}/members`, label: "Members" },
    { href: `${basePath}/polls`, label: "Polls" },
    { href: `${basePath}/fundraising`, label: "Fundraising" },
    { href: `${basePath}/events`, label: "Events" },
    { href: `${basePath}/posts`, label: "Posts" },
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
