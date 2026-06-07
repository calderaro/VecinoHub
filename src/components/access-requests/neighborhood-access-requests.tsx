"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { formatPortDateTime } from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type NeighborhoodAccessRequest = {
  id: string;
  groupId: string;
  groupName: string;
  requestedBy: string;
  requesterName: string | null;
  requesterEmail: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  note: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
};

type NeighborhoodAccessRequestsTab = "pending" | "history";

export function NeighborhoodAccessRequests({
  pending,
  history,
  timeZone,
}: {
  pending: NeighborhoodAccessRequest[];
  history: NeighborhoodAccessRequest[];
  timeZone: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const locale = useLocale();
  const t = useTranslations("admin.accessRequests");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NeighborhoodAccessRequestsTab>("pending");

  function formatDate(value: Date) {
    return formatPortDateTime(value, timeZone, locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const approveRequest = trpc.groupAccessRequests.approve.useMutation({
    onSuccess: () => {
      setActiveRequestId(null);
      addToast(t("toasts.approved"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveRequestId(null);
      addToast(err.message, "error");
    },
  });

  const rejectRequest = trpc.groupAccessRequests.reject.useMutation({
    onSuccess: () => {
      setActiveRequestId(null);
      addToast(t("toasts.rejected"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveRequestId(null);
      addToast(err.message, "error");
    },
  });

  const isMutating = approveRequest.isPending || rejectRequest.isPending;

  const tabs: Array<{
    key: NeighborhoodAccessRequestsTab;
    label: string;
    count: number;
  }> = [
    { key: "pending", label: t("tabs.pending"), count: pending.length },
    { key: "history", label: t("tabs.history"), count: history.length },
  ];

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap items-center gap-3"
        role="tablist"
        aria-label={t("title")}
        data-testid="neighborhood-access-requests-tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              className={`vh-v3-focus inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-teal-500 bg-white text-stone-900 shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
              }`}
              type="button"
              role="tab"
              id={`neighborhood-access-requests-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`neighborhood-access-requests-panel-${tab.key}`}
              data-testid={`neighborhood-access-requests-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-teal-100 text-teal-700" : "bg-stone-100 text-stone-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "pending" ? (
        <section
          className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
          role="tabpanel"
          id="neighborhood-access-requests-panel-pending"
          aria-labelledby="neighborhood-access-requests-tab-pending"
          data-testid="neighborhood-access-requests-panel-pending"
        >
          {pending.length === 0 ? (
            <p className="text-sm text-stone-500">{t("pendingEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => {
                const requestBusy =
                  activeRequestId === request.id &&
                  (approveRequest.isPending || rejectRequest.isPending);

                return (
                  <div
                    key={request.id}
                    className="space-y-3 rounded-lg border border-stone-200 bg-white px-3 py-3"
                    data-testid={`neighborhood-access-request-row-${request.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {request.requesterName ?? request.requesterEmail}
                        </p>
                        <p className="text-xs text-stone-500">{request.requesterEmail}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                          {request.groupName}
                        </span>
                        <StatusBadge variant="pending" label={t("statuses.pending")} />
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
                      <p>{t("createdOn", { date: formatDate(request.createdAt) })}</p>
                      <p>{t("expiresOn", { date: formatDate(request.expiresAt) })}</p>
                    </div>

                    {request.note ? (
                      <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                          {t("note")}
                        </p>
                        <p className="mt-1 text-sm text-stone-700">{request.note}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => {
                          setActiveRequestId(request.id);
                          rejectRequest.mutate({ requestId: request.id });
                        }}
                        disabled={isMutating}
                        data-testid={`neighborhood-access-request-reject-${request.id}`}
                      >
                        {requestBusy && rejectRequest.isPending
                          ? t("rejecting")
                          : t("reject")}
                      </button>
                      <button
                        className="vh-v3-focus rounded-md bg-teal-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => {
                          setActiveRequestId(request.id);
                          approveRequest.mutate({ requestId: request.id });
                        }}
                        disabled={isMutating}
                        data-testid={`neighborhood-access-request-approve-${request.id}`}
                      >
                        {requestBusy && approveRequest.isPending
                          ? t("approving")
                          : t("approve")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section
          className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
          role="tabpanel"
          id="neighborhood-access-requests-panel-history"
          aria-labelledby="neighborhood-access-requests-tab-history"
          data-testid="neighborhood-access-requests-panel-history"
        >
          {history.length === 0 ? (
            <p className="text-sm text-stone-500">{t("historyEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {history.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3"
                  data-testid={`neighborhood-access-request-history-row-${request.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {request.requesterName ?? request.requesterEmail}
                    </p>
                    <p className="text-xs text-stone-500">{request.requesterEmail}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {request.reviewedAt
                        ? t("reviewedOn", { date: formatDate(request.reviewedAt) })
                        : t("updatedOn", { date: formatDate(request.updatedAt) })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                      {request.groupName}
                    </span>
                    <StatusBadge
                      variant={request.status}
                      label={t(`statuses.${request.status}`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
