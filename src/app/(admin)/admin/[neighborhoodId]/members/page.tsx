import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NeighborhoodMembersManager } from "@/components/platform/neighborhood-members-manager";
import { listNeighborhoodMembersPaged } from "@/services/neighborhoods";
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

  const [members, t, tManager] = await Promise.all([
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      limit: 100,
      offset: 0,
    }),
    getTranslations("admin.members"),
    getTranslations("admin.neighborhoodMembersManager"),
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
        <div className="px-6 py-5" data-testid="admin-members-manager">
          <NeighborhoodMembersManager
            neighborhoodId={resolvedParams.neighborhoodId}
            initialMembers={members.items}
            userDetailHrefBase={null}
            assignableRoles={["neighbor", "neighborhood_admin"]}
            editableRoles={["neighbor", "neighborhood_admin"]}
            heading={t("managerTitle")}
            emptyMessage={tManager("empty")}
            itemActionsMode="dialog"
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
