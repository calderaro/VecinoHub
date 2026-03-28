import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { listNeighborhoodReservations } from "@/services/resources";
import { getSession } from "@/server/auth";

export default async function AdminResourceReservationsPage({
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

  const [locale, t, tStatus, reservations] = await Promise.all([
    getLocale(),
    getTranslations("admin.resources.reservationsPage"),
    getTranslations("status"),
    listNeighborhoodReservations(serviceContext, { neighborhoodId }).catch(() => null),
  ]);
  if (!reservations) {
    redirect(`/admin/${neighborhoodId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {reservations.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-resource-reservations-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.resource")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.group")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.title")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.start")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reservations.map((item) => (
                  <tr key={item.reservation.id} data-testid={`admin-resource-reservation-${item.reservation.id}`}>
                    <td className="px-5 py-3.5 font-medium text-stone-900">{item.resourceName}</td>
                    <td className="px-4 py-3.5 text-stone-500">{item.groupName}</td>
                    <td className="px-4 py-3.5 text-stone-700">
                      <p>{item.reservation.title}</p>
                      <p className="text-xs text-stone-400">{item.requestedByName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: item.timeZone,
                      }).format(item.reservation.startAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        variant={getResourceStatusVariant(item.reservation.status) as never}
                        label={tStatus(item.reservation.status)}
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
