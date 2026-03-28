import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ResourceBlockForm } from "@/components/resources/resource-block-form";
import { RemoveBlockButton } from "@/components/resources/remove-block-button";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getNeighborhoodBlocksPageData } from "@/services/resources";
import { getSession } from "@/server/auth";

export default async function AdminResourceBlocksPage({
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

  const [locale, t, tReasons, neighborhood, data] = await Promise.all([
    getLocale(),
    getTranslations("admin.resources.blocksPage"),
    getTranslations("resourcesUi.blockReasons"),
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    getNeighborhoodBlocksPageData(serviceContext, { neighborhoodId }).catch(() => null),
  ]);
  if (!data || !neighborhood) {
    redirect(`/admin/${neighborhoodId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </header>

      <ResourceBlockForm
        resources={data.resources.map((resource) => ({ id: resource.id, name: resource.name }))}
        timeZone={neighborhood.timeZone}
      />

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {data.blocks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500">{t("empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-resource-blocks-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.resource")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.reason")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.start")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.end")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.blocks.map((item) => (
                  <tr key={item.block.id} data-testid={`admin-resource-block-${item.block.id}`}>
                    <td className="px-5 py-3.5 font-medium text-stone-900">{item.resourceName}</td>
                    <td className="px-4 py-3.5 text-stone-700">
                      <p className="capitalize">{tReasons(item.block.reason)}</p>
                      {item.block.reasonText ? (
                        <p className="text-xs text-stone-400">{item.block.reasonText}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: item.timeZone,
                      }).format(item.block.startAt)}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: item.timeZone,
                      }).format(item.block.endAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <RemoveBlockButton
                        blockId={item.block.id}
                        testId={`admin-resource-block-remove-${item.block.id}`}
                      />
                    </td>
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
