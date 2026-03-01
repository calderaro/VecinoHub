import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PencilIcon, UsersIcon } from "lucide-react";

import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { StatusBadge } from "@/components/ui-v3";
import { getUserById, listUserMemberships } from "@/services/users";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin");
  }

  const resolvedParams = await Promise.resolve(params);
  const [user, memberships, locale, t, tTable] = await Promise.all([
    getUserById({ user: session.user }, resolvedParams),
    listUserMemberships({ user: session.user }, { userId: resolvedParams.userId, limit: 20 }),
    getLocale(),
    getTranslations("admin.userDetail"),
    getTranslations("admin.usersTable"),
  ]);

  const displayName = user.username ?? user.name;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6" data-testid="user-detail-root">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href="/admin/users"
        data-testid="user-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                {user.image ? (
                  <Image
                    className="h-11 w-11 rounded-full border border-stone-200 object-cover"
                    src={user.image}
                    alt={displayName}
                    width={44}
                    height={44}
                    sizes="44px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                    {(displayName?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                    {t("label")}
                  </p>
                  <h1 className="truncate text-xl font-bold text-stone-900">{displayName}</h1>
                  <p className="truncate text-sm text-stone-400">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge variant={user.role} label={tTable(`roles.${user.role}`)} />
                <StatusBadge variant={user.status} label={tTable(`statuses.${user.status}`)} />
                <span className="text-xs text-stone-400">
                  {t("createdAt")} {formatDate(user.createdAt, locale)}
                </span>
                <span className="text-xs text-stone-400">
                  {t("updatedAt")} {formatDate(user.updatedAt, locale)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/admin/users/${user.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                data-testid="user-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <UserDetailActions userId={user.id} role={user.role} status={user.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.totalMemberships")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{user.membershipsTotal}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.activeMemberships")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{user.membershipsActive}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.managedGroups")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{user.groupsManaged}</p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5" data-testid="user-detail-memberships">
          <div className="flex items-center gap-2 text-stone-500">
            <UsersIcon className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">{t("membershipsTitle")}</p>
          </div>

          {memberships.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
              {t("noMemberships")}
            </p>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <Link
                  key={membership.membershipId}
                  href={`/admin/groups/${membership.groupId}`}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2.5 transition-colors hover:bg-stone-50"
                  data-testid={`user-detail-membership-${membership.membershipId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{membership.groupName}</p>
                    <p className="truncate text-xs text-stone-400">{membership.groupAddress ?? "-"}</p>
                  </div>
                  <StatusBadge
                    variant={membership.membershipStatus}
                    label={membership.membershipStatus === "active" ? tTable("statuses.active") : tTable("statuses.inactive")}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
