import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { CancelReservationButton } from "@/components/resources/cancel-reservation-button";
import { StatusBadge } from "@/components/ui-v3";
import { formatPortDateTime } from "@/lib/port-time";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { listGroupReservations } from "@/services/resources";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentReservationsPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId } = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };

  const [locale, t, tStatus, reservations] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.resourceReservations"),
    getTranslations("status"),
    listGroupReservations(serviceContext, { groupId }).catch(() => null),
  ]);

  if (!reservations) {
    redirect(`/dashboard/${groupId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {reservations.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500" data-testid="dashboard-reservations-empty">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="dashboard-reservations-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.resource")}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reservations.map((item) => (
                  <tr key={item.reservation.id} data-testid={`dashboard-reservation-${item.reservation.id}`}>
                    <td className="px-5 py-3.5 font-medium text-stone-900">{item.resourceName}</td>
                    <td className="px-4 py-3.5 text-stone-700">
                      <p>{item.reservation.title}</p>
                      {item.resourceLocation ? (
                        <p className="text-xs text-stone-400">{item.resourceLocation}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {formatPortDateTime(item.reservation.startAt, item.timeZone, locale)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        variant={getResourceStatusVariant(item.reservation.status) as never}
                        label={tStatus(item.reservation.status)}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      {item.reservation.status === "approved" ? (
                        <CancelReservationButton
                          reservationId={item.reservation.id}
                          testId={`dashboard-reservation-cancel-${item.reservation.id}`}
                        />
                      ) : (
                        <span className="text-xs text-stone-400">{t("table.noActions")}</span>
                      )}
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
