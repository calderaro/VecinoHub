"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BellIcon,
  Building2Icon,
  CalendarIcon,
  CoinsIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  UsersIcon,
  VoteIcon,
  XIcon,
} from "lucide-react";

type AdminShellChromeProps = {
  children: React.ReactNode;
  userInitial: string;
};

type NavItem = {
  href: string;
  key: "overview" | "users" | "groups" | "polls" | "fundraising" | "events" | "posts";
  icon: React.ReactNode;
};

function getActiveKey(pathname: string): NavItem["key"] {
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/groups")) return "groups";
  if (pathname.startsWith("/admin/polls")) return "polls";
  if (pathname.startsWith("/admin/fundraising")) return "fundraising";
  if (pathname.startsWith("/admin/events")) return "events";
  if (pathname.startsWith("/admin/posts")) return "posts";
  return "overview";
}

export function AdminShellChrome({ children, userInitial }: AdminShellChromeProps) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/admin", key: "overview", icon: <LayoutDashboardIcon className="h-4 w-4" /> },
    { href: "/admin/users", key: "users", icon: <UsersIcon className="h-4 w-4" /> },
    { href: "/admin/groups", key: "groups", icon: <Building2Icon className="h-4 w-4" /> },
    { href: "/admin/polls", key: "polls", icon: <VoteIcon className="h-4 w-4" /> },
    { href: "/admin/fundraising", key: "fundraising", icon: <CoinsIcon className="h-4 w-4" /> },
    { href: "/admin/events", key: "events", icon: <CalendarIcon className="h-4 w-4" /> },
    { href: "/admin/posts", key: "posts", icon: <FileTextIcon className="h-4 w-4" /> },
  ];

  const activeKey = getActiveKey(pathname);
  const activeLabel = t(activeKey);

  return (
    <div className="vh-v3 vh-v3-font min-h-screen bg-stone-100 text-stone-900">
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-stone-900/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-stone-800 bg-stone-900 transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-stone-800 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.5L1.5 6v8h4.5v-4.5h4V14h4.5V6L8 1.5z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">VecinoHub</p>
              <div className="flex items-center gap-1">
                <ShieldIcon className="h-2.5 w-2.5 text-teal-400" aria-hidden="true" />
                <p className="text-[10px] font-medium uppercase tracking-wide text-teal-400">
                  {t("label")}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="vh-v3-scrollbar flex-1 overflow-y-auto px-2 py-3">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive =
              activeKey === item.key &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`) || item.href === "/admin");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`vh-v3-focus mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-teal-600 text-white" : "text-stone-400 hover:bg-stone-800 hover:text-white"}`}
                onClick={() => setMobileNavOpen(false)}
              >
                {item.icon}
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-800 p-3">
          <Link
            href="/dashboard"
            className="vh-v3-focus flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
          >
            <LogOutIcon className="h-4 w-4" />
            Exit Admin
          </Link>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-60">
        <header className="sticky top-0 z-20 h-14 border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-100 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                {activeKey === "overview" ? (
                  <span className="font-medium text-stone-900">{activeLabel}</span>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      className="text-stone-500 transition-colors hover:text-stone-700"
                    >
                      {t("label")}
                    </Link>
                    <span className="text-stone-300" aria-hidden="true">
                      ›
                    </span>
                    <span className="font-medium text-stone-900">{activeLabel}</span>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="Notifications"
              >
                <BellIcon className="h-4.5 w-4.5" />
              </button>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                {userInitial}
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
