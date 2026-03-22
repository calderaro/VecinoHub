"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";
import { trpc } from "@/lib/trpc";

type GroupAccessRequestItem = {
  id: string;
  groupId: string;
  groupName: string;
  neighborhoodId: string;
  neighborhoodName: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  note: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function DashboardRequestAccess({
  pending,
  history,
}: {
  pending: GroupAccessRequestItem[];
  history: GroupAccessRequestItem[];
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.requestAccess");
  const { addToast } = useToast();
  const [slugInput, setSlugInput] = useState("");
  const [lookupSlug, setLookupSlug] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [note, setNote] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const neighborhoodLookup = trpc.groupAccessRequests.lookupNeighborhood.useQuery(
    { slug: lookupSlug },
    {
      enabled: lookupSlug.length > 0,
      retry: false,
    }
  );

  const requestableGroups = trpc.groupAccessRequests.listRequestableGroups.useQuery(
    { neighborhoodId: neighborhoodLookup.data?.id ?? "00000000-0000-0000-0000-000000000000" },
    {
      enabled: Boolean(neighborhoodLookup.data?.id),
      retry: false,
    }
  );

  const createRequest = trpc.groupAccessRequests.create.useMutation({
    onSuccess: () => {
      addToast(t("toasts.created"), "success");
      setSelectedGroupId("");
      setNote("");
      router.refresh();
    },
    onError: (error) => {
      addToast(error.message, "error");
    },
  });

  const cancelRequest = trpc.groupAccessRequests.cancel.useMutation({
    onSuccess: () => {
      setActiveRequestId(null);
      addToast(t("toasts.cancelled"), "success");
      router.refresh();
    },
    onError: (error) => {
      setActiveRequestId(null);
      addToast(error.message, "error");
    },
  });

  const lookupError = neighborhoodLookup.error?.message;
  const requestableGroupItems = requestableGroups.data ?? [];
  const isCreating = createRequest.isPending;
  const isCancelling = cancelRequest.isPending;

  return (
    <div className="space-y-8" data-testid="dashboard-request-access-root">
      <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-stone-900">{t("form.title")}</h2>
          <p className="text-sm text-stone-500">{t("form.subtitle")}</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedSlug = slugInput.trim();

            if (!trimmedSlug) {
              addToast(t("form.slugRequired"), "error");
              return;
            }

            setLookupSlug(trimmedSlug);
            setSelectedGroupId("");
          }}
        >
          <label className="space-y-2 text-sm text-stone-700">
            <span>{t("form.slugLabel")}</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={slugInput}
                onChange={(event) => setSlugInput(event.target.value)}
                placeholder={t("form.slugPlaceholder")}
                className="vh-v3-focus flex-1 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                data-testid="request-access-slug-input"
              />
              <button
                type="submit"
                className="vh-v3-focus rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={neighborhoodLookup.isLoading}
                data-testid="request-access-slug-submit"
              >
                {neighborhoodLookup.isLoading ? t("form.searching") : t("form.search")}
              </button>
            </div>
          </label>
        </form>

        {lookupError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            data-testid="request-access-lookup-error"
          >
            {lookupError}
          </p>
        ) : null}

        {neighborhoodLookup.data ? (
          <div
            className="rounded-xl border border-teal-100 bg-teal-50/60 p-4"
            data-testid="request-access-neighborhood-result"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
                  {t("form.neighborhoodLabel")}
                </p>
                <p className="text-lg font-semibold text-stone-900">
                  {neighborhoodLookup.data.name}
                </p>
                <p className="text-sm text-stone-500">/{neighborhoodLookup.data.slug}</p>
              </div>
              <StatusBadge
                variant="active"
                label={t("form.groupsCount", { count: requestableGroupItems.length })}
              />
            </div>

            <div className="mt-4 space-y-4">
              <label className="space-y-2 text-sm text-stone-700">
                <span>{t("form.groupLabel")}</span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={requestableGroups.isLoading || requestableGroupItems.length === 0}
                  data-testid="request-access-group-select"
                >
                  <option value="">{t("form.groupPlaceholder")}</option>
                  {requestableGroupItems.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                      {group.address ? ` - ${group.address}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {requestableGroups.isLoading ? (
                <p className="text-sm text-stone-500">{t("form.loadingGroups")}</p>
              ) : null}

              {!requestableGroups.isLoading && requestableGroupItems.length === 0 ? (
                <p
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
                  data-testid="request-access-groups-empty"
                >
                  {t("form.noGroups")}
                </p>
              ) : null}

              <label className="space-y-2 text-sm text-stone-700">
                <span>{t("form.noteLabel")}</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("form.notePlaceholder")}
                  className="vh-v3-focus min-h-28 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                  maxLength={500}
                  data-testid="request-access-note"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="vh-v3-focus rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                  onClick={() => {
                    setLookupSlug("");
                    setSelectedGroupId("");
                    setNote("");
                  }}
                  disabled={isCreating}
                  data-testid="request-access-reset"
                >
                  {t("form.reset")}
                </button>
                <button
                  type="button"
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => createRequest.mutate({ groupId: selectedGroupId, note: note.trim() || undefined })}
                  disabled={!selectedGroupId || isCreating}
                  data-testid="request-access-submit"
                >
                  {isCreating ? t("form.submitting") : t("form.submit")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{t("pending.title")}</h2>
            <p className="text-sm text-stone-500">{t("pending.subtitle")}</p>
          </div>
          <StatusBadge
            variant="pending"
            label={t("pending.count", { count: pending.length })}
          />
        </div>

        {pending.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center text-sm text-stone-500"
            data-testid="request-access-pending-empty"
          >
            {t("pending.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((request) => {
              const isActive = activeRequestId === request.id && isCancelling;

              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                  data-testid={`request-access-row-${request.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
                        {request.neighborhoodName}
                      </p>
                      <h3 className="text-lg font-semibold text-stone-900">{request.groupName}</h3>
                    </div>
                    <StatusBadge variant="pending" label={t("statuses.pending")} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                    <p>{t("submittedOn", { date: formatDate(request.createdAt) })}</p>
                    <p>{t("expiresOn", { date: formatDate(request.expiresAt) })}</p>
                  </div>

                  {request.note ? (
                    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                        {t("noteLabel")}
                      </p>
                      <p className="mt-1 text-sm text-stone-700">{request.note}</p>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setActiveRequestId(request.id);
                        cancelRequest.mutate({ requestId: request.id });
                      }}
                      disabled={isCancelling}
                      data-testid={`request-access-cancel-${request.id}`}
                    >
                      {isActive ? t("pending.cancelling") : t("pending.cancel")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{t("history.title")}</h2>
          <p className="text-sm text-stone-500">{t("history.subtitle")}</p>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
            {t("history.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{request.groupName}</p>
                    <p className="text-xs text-stone-500">{request.neighborhoodName}</p>
                  </div>
                  <StatusBadge
                    variant={
                      request.status === "approved"
                        ? "active"
                        : request.status === "pending"
                          ? "pending"
                          : request.status === "expired"
                            ? "inactive"
                            : request.status
                    }
                    label={t(`statuses.${request.status}`)}
                  />
                </div>

                <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                  <p>{t("submittedOn", { date: formatDate(request.createdAt) })}</p>
                  <p>
                    {request.reviewedAt
                      ? t("reviewedOn", { date: formatDate(request.reviewedAt) })
                      : t("expiresOn", { date: formatDate(request.expiresAt) })}
                  </p>
                </div>

                {request.status === "approved" ? (
                  <div className="mt-4">
                    <Link
                      href={`/dashboard/${request.groupId}`}
                      className="text-sm font-medium text-teal-700 transition-colors hover:text-teal-800"
                      data-testid={`request-access-open-group-${request.groupId}`}
                    >
                      {t("history.openGroup")}
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
