import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, Building2Icon, MapPinnedIcon, PencilIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusChip } from "@/components/dashboard-v2";
import { PlatformUserManagementCard } from "@/components/platform/user-management-card";
import { StatusBadge } from "@/components/ui-v3";
import {
  getPlatformUserById,
  listPlatformUserGroupMemberships,
  listPlatformUserNeighborhoodMemberships,
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

export default async function PlatformUserDetailPage({
  params,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "platform_admin") {
    redirect("/");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [user, neighborhoodMemberships, groupMemberships, locale, t] = await Promise.all([
    getPlatformUserById(serviceContext, { userId: resolvedParams.userId }),
    listPlatformUserNeighborhoodMemberships(serviceContext, {
      userId: resolvedParams.userId,
      limit: 20,
    }),
    listPlatformUserGroupMemberships(serviceContext, {
      userId: resolvedParams.userId,
      limit: 50,
    }),
    getLocale(),
    getTranslations("platform.userDetail"),
  ]);

  const displayName = user.username ?? user.name;

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6"
      data-testid="platform-user-detail-root"
    >
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href="/platform/users"
        data-testid="platform-user-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-3">
                {user.image ? (
                  <Image
                    className="h-12 w-12 rounded-full border border-stone-200 object-cover"
                    src={user.image}
                    alt={displayName}
                    width={48}
                    height={48}
                    sizes="48px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                    {(displayName?.[0] ?? "?").toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                    {t("label")}
                  </p>
                  <h1 className="truncate text-2xl font-bold text-stone-900">{displayName}</h1>
                  <p className="truncate text-sm text-stone-400">{user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge variant={user.role} label={t(`roles.${user.role}`)} />
                <StatusBadge variant={user.status} label={t(`statuses.${user.status}`)} />
                <span className="text-xs text-stone-400">
                  {t("createdAt")} {formatDate(user.createdAt, locale)}
                </span>
                <span className="text-xs text-stone-400">
                  {t("updatedAt")} {formatDate(user.updatedAt, locale)}
                </span>
              </div>
            </div>

            <Link
              href={`/platform/users/${user.id}/edit`}
              className="vh-v3-focus inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              data-testid="platform-user-edit-link"
            >
              <PencilIcon className="h-4 w-4" />
              {t("edit")}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 md:grid-cols-4">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("stats.groups")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {user.groupMembershipsTotal}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("stats.activeGroups")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {user.groupMembershipsActive}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("stats.neighborhoods")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {user.neighborhoodMembershipsTotal}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("stats.managedNeighborhoods")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {user.neighborhoodsManaged}
            </p>
          </div>
        </div>
      </section>

      <PlatformUserManagementCard
        userId={user.id}
        initialRole={user.role}
        initialStatus={user.status}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          data-testid="platform-user-neighborhood-memberships"
        >
          <div className="mb-4 flex items-center gap-2 text-stone-500">
            <MapPinnedIcon className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {t("neighborhoodMembershipsTitle")}
            </h2>
          </div>

          {neighborhoodMemberships.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
              {t("noNeighborhoodMemberships")}
            </p>
          ) : (
            <div className="space-y-2">
              {neighborhoodMemberships.map((membership) => (
                <Link
                  key={membership.membershipId}
                  href={`/platform/${membership.neighborhoodId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-3 transition-colors hover:bg-stone-50"
                  data-testid={`platform-user-neighborhood-membership-${membership.membershipId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {membership.neighborhoodName}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      /{membership.neighborhoodSlug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusChip
                      variant={membership.membershipRole}
                      label={t(`neighborhoodRoles.${membership.membershipRole}`)}
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
        </section>

        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          data-testid="platform-user-group-memberships"
        >
          <div className="mb-4 flex items-center gap-2 text-stone-500">
            <Building2Icon className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {t("groupMembershipsTitle")}
            </h2>
          </div>

          {groupMemberships.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
              {t("noGroupMemberships")}
            </p>
          ) : (
            <div className="space-y-2">
              {groupMemberships.map((membership) => (
                <Link
                  key={membership.membershipId}
                  href={`/admin/${membership.neighborhoodId}/groups/${membership.groupId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-3 transition-colors hover:bg-stone-50"
                  data-testid={`platform-user-group-membership-${membership.membershipId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {membership.groupName}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      {membership.neighborhoodName}
                      {membership.groupAddress ? ` · ${membership.groupAddress}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusBadge
                      variant={membership.membershipRole}
                      label={t(`groupRoles.${membership.membershipRole}`)}
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
        </section>
      </div>
    </div>
  );
}
