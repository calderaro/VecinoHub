import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { GroupDetailActions } from "@/components/groups/group-detail-actions";
import { GroupMembers } from "@/components/groups/group-members";
import { StatusBadge } from "@/components/ui-v3";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function GroupDetailPage({
  params,
}: {
  params:
    | { neighborhoodId: string; groupId: string }
    | Promise<{ neighborhoodId: string; groupId: string }>;
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
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const members = await listGroupMembers(serviceContext, {
    groupId: resolvedParams.groupId,
  });

  const locale = await getLocale();
  const t = await getTranslations("admin.groupDetail");

  const statusVariant = members.length > 0 ? "active" : "inactive";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href={`${adminBasePath}/groups`}
        data-testid="group-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                {t("groupLabel")}
              </p>
              <h1 className="mb-2 text-xl font-bold text-stone-900">{group.name}</h1>
              {group.address ? <p className="mb-3 text-sm text-stone-500">{group.address}</p> : null}
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  variant={statusVariant}
                  label={statusVariant === "active" ? t("status.active") : t("status.inactive")}
                />
                <span className="text-xs text-stone-400">
                  {t("createdLabel")} {formatDate(group.createdAt, locale)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                href={`${adminBasePath}/groups/${group.id}/edit`}
                data-testid="group-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <GroupDetailActions groupId={group.id} adminBasePath={adminBasePath} />
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold">{t("membersTitle")}</h2>
          <GroupMembers groupId={group.id} members={members} canManage />
        </div>
      </section>
    </div>
  );
}
