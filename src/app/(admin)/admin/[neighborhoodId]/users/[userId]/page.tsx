import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";

import { StatusBadge } from "@/components/ui-v3";
import {
  getNeighborhoodUserById,
  listNeighborhoodUserMemberships,
} from "@/services/users";
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
  params:
    | { neighborhoodId: string; userId: string }
    | Promise<{ neighborhoodId: string; userId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };

  const [user, memberships, locale, t] = await Promise.all([
    getNeighborhoodUserById(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      userId: resolvedParams.userId,
    }),
    listNeighborhoodUserMemberships(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      userId: resolvedParams.userId,
      limit: 20,
    }),
    getLocale(),
    getTranslations("admin.userDetail"),
  ]);

  const displayName = user.username ?? user.name;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6" data-testid="user-detail-root">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href={`${adminBasePath}/users`}
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
                <StatusBadge variant={user.status} label={t(`statuses.${user.status}`)} />
                <span className="text-xs text-stone-400">
                  {t("createdAt")} {formatDate(user.createdAt, locale)}
                </span>
                <span className="text-xs text-stone-400">
                  {t("updatedAt")} {formatDate(user.updatedAt, locale)}
                </span>
              </div>
            </div>
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
                  href={`${adminBasePath}/groups/${membership.groupId}`}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2.5 transition-colors hover:bg-stone-50"
                  data-testid={`user-detail-membership-${membership.membershipId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{membership.groupName}</p>
                    <p className="truncate text-xs text-stone-400">
                      {membership.groupAddress ?? t("noAddress")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      variant={membership.membershipRole}
                      label={t(`membershipRoles.${membership.membershipRole}`)}
                    />
                    <StatusBadge
                      variant={membership.membershipStatus}
                      label={t(`statuses.${membership.membershipStatus}`)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
