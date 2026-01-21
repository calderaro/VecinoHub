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
    <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "text-emerald-200"
                : "transition hover:text-emerald-200"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
