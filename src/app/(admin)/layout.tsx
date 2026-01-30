import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { UserMenu } from "@/components/user-menu";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const groups = await listUserGroups({ user: session.user });
  const t = await getTranslations("admin.nav");

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <header className="border-b border-[color:var(--stroke)] bg-[color:var(--surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link href="/admin" className="group flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition group-hover:text-[color:var(--accent)]">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)] group-hover:opacity-80">
              {t("label")}
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin">
              {t("overview")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/users">
              {t("users")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/groups">
              {t("groups")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/polls">
              {t("polls")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/fundraising">
              {t("fundraising")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/events">
              {t("events")}
            </Link>
            <Link className="hover:text-[color:var(--accent-strong)]" href="/admin/posts">
              {t("posts")}
            </Link>
          </nav>
          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
          />
        </div>
      </header>
      {children}
    </div>
  );
}
