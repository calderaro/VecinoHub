import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/ui-v3";

import { formatDateKeyLabel, getResourceStatusVariant, minuteToTimeLabel } from "./utils";

type CalendarEntry = {
  date: string;
  windows: Array<{ id: string; startMinute: number; endMinute: number }>;
  reservations: Array<{
    id: string;
    title: string | null;
    status: string;
    startMinute: number;
    endMinute: number;
    groupName?: string | null;
    requestedByName?: string | null;
  }>;
  blocks: Array<{
    id: string;
    reason: string;
    reasonText?: string | null;
    startMinute: number;
    endMinute: number;
  }>;
};

export function AvailabilityCalendar({
  entries,
  locale,
  timeZone,
  showAdminDetails = false,
}: {
  entries: CalendarEntry[];
  locale: string;
  timeZone: string;
  showAdminDetails?: boolean;
}) {
  const t = useTranslations("resourcesUi.calendar");
  const tStatus = useTranslations("status");
  const tReasons = useTranslations("resourcesUi.blockReasons");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="resource-calendar">
      {entries.map((entry) => (
        <article
          key={entry.date}
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          data-testid={`resource-calendar-day-${entry.date}`}
        >
          <header className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">
              {formatDateKeyLabel(entry.date, locale, timeZone)}
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-stone-400">{entry.date}</span>
          </header>

          <div className="space-y-3">
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {t("availableWindows")}
              </p>
              {entry.windows.length === 0 ? (
                <p className="mt-1 text-sm text-stone-500">{t("noAvailability")}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {entry.windows.map((window) => (
                    <li key={window.id} className="text-sm text-stone-600">
                      {minuteToTimeLabel(window.startMinute)} - {minuteToTimeLabel(window.endMinute)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {t("reservations")}
              </p>
              {entry.reservations.length === 0 ? (
                <p className="mt-1 text-sm text-stone-500">{t("noReservations")}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {entry.reservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-stone-900">
                            {reservation.title ?? t("reserved")}
                          </p>
                          <p className="text-xs text-stone-500">
                            {minuteToTimeLabel(reservation.startMinute)} -{" "}
                            {minuteToTimeLabel(reservation.endMinute)}
                          </p>
                          {showAdminDetails ? (
                            <p className="mt-1 text-xs text-stone-500">
                              {reservation.groupName ?? t("unknownGroup")}
                              {reservation.requestedByName
                                ? ` · ${reservation.requestedByName}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge
                          variant={getResourceStatusVariant(reservation.status) as never}
                          label={tStatus(reservation.status)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {t("blocks")}
              </p>
              {entry.blocks.length === 0 ? (
                <p className="mt-1 text-sm text-stone-500">{t("noBlocks")}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {entry.blocks.map((block) => (
                    <div
                      key={block.id}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                    >
                      <p className="text-sm font-medium capitalize text-amber-900">
                        {tReasons(block.reason)}
                      </p>
                      <p className="text-xs text-amber-800">
                        {minuteToTimeLabel(block.startMinute)} - {minuteToTimeLabel(block.endMinute)}
                      </p>
                      {block.reasonText ? (
                        <p className="mt-1 text-xs text-amber-700">{block.reasonText}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}
