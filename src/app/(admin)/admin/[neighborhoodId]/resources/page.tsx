import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { HelpContextPanel } from "@/components/help/HelpContextPanel";
import { StatusBadge } from "@/components/ui-v3";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { listContextHelpByScreen } from "@/lib/help-content";
import { listNeighborhoodResources } from "@/services/resources";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminResourcesPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [neighborhood, resourceList] = await Promise.all([
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    listNeighborhoodResources(serviceContext, { neighborhoodId }).catch(() => []),
  ]);
  const [locale, t, tStatus] = await Promise.all([
    getLocale(),
    getTranslations("admin.resources.list"),
    getTranslations("status"),
  ]);

  if (!neighborhood) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{neighborhood.name}</p>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpContextPanel entries={listContextHelpByScreen(locale, "admin-resources")} />
          <Link
            href={`/admin/${neighborhoodId}/resources/blocks`}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            data-testid="admin-resources-blocks-link"
          >
            {t("links.blocks")}
          </Link>
          <Link
            href={`/admin/${neighborhoodId}/resources/reservations`}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            data-testid="admin-resources-reservations-link"
          >
            {t("links.reservations")}
          </Link>
          <Link
            href={`/admin/${neighborhoodId}/resources/new`}
            className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            data-testid="admin-resource-add"
          >
            {t("links.new")}
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {resourceList.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500" data-testid="admin-resource-empty">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-resource-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.name")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.capacity")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.upcomingReservations")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.futureBlocks")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {resourceList.map((resource) => (
                  <tr
                    key={resource.id}
                    className="hover:bg-stone-50"
                    data-testid={`admin-resource-row-${resource.id}`}
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/${neighborhoodId}/resources/${resource.id}`}
                        className="font-medium text-stone-900 hover:text-teal-700"
                      >
                        {resource.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {resource.location || resource.type || t("table.noLocation")}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        variant={getResourceStatusVariant(resource.status) as never}
                        label={tStatus(resource.status)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">{resource.capacity ?? "—"}</td>
                    <td className="px-4 py-3.5 text-stone-500">{resource.upcomingReservations}</td>
                    <td className="px-4 py-3.5 text-stone-500">{resource.upcomingBlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
