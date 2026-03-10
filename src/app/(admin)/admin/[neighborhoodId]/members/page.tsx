import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NeighborhoodMembersManager } from "@/components/platform/neighborhood-members-manager";
import {
  getNeighborhoodById,
  listNeighborhoodMembersPaged,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminNeighborhoodMembersPage({
  params,
}: {
  params:
    | { neighborhoodId: string }
    | Promise<{ neighborhoodId: string }>;
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

  const [neighborhood, members, adminMembers, activeMembers, t] = await Promise.all([
    getNeighborhoodById(serviceContext, { neighborhoodId: resolvedParams.neighborhoodId }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      limit: 100,
      offset: 0,
    }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      role: "neighborhood_admin",
      limit: 1,
      offset: 0,
    }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      status: "active",
      limit: 1,
      offset: 0,
    }),
    getTranslations("admin.members"),
  ]);

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6"
      data-testid="admin-members-root"
    >
      <Link
        href={adminBasePath}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
            {neighborhood.name}
          </p>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.members")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{members.total}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.active")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{activeMembers.total}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.admins")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{adminMembers.total}</p>
          </div>
        </div>

        <div className="px-6 py-5" data-testid="admin-members-manager">
          <NeighborhoodMembersManager
            neighborhoodId={resolvedParams.neighborhoodId}
            initialMembers={members.items}
            userDetailHrefBase={null}
          />
          {members.total > members.items.length ? (
            <p className="mt-3 text-xs text-stone-400">
              {t("showingFirst", { count: members.items.length })}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
