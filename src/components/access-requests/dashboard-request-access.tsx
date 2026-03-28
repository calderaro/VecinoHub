"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CopyIcon, SearchIcon, XIcon } from "lucide-react";

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

type ShareNeighborhoodLinkOption = {
  id: string;
  name: string;
  slug: string;
};

type DashboardRequestAccessProps = {
  pending: GroupAccessRequestItem[];
  history: GroupAccessRequestItem[];
  initialSlug?: string;
  shareNeighborhoods?: ShareNeighborhoodLinkOption[];
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
  initialSlug = "",
  shareNeighborhoods = [],
}: DashboardRequestAccessProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.requestAccess");
  const { addToast } = useToast();
  const [slugInput, setSlugInput] = useState(initialSlug);
  const [lookupSlug, setLookupSlug] = useState(initialSlug);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [note, setNote] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(Boolean(initialSlug));

  const hasPrefilledSlug = initialSlug.length > 0;
  const shareableNeighborhoods = useMemo(
    () => shareNeighborhoods.filter((neighborhood) => neighborhood.slug.trim().length > 0),
    [shareNeighborhoods]
  );

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
  const hasActiveLookup = Boolean(lookupSlug || neighborhoodLookup.data);

  function resetFormState() {
    setSlugInput(initialSlug);
    setLookupSlug(initialSlug);
    setSelectedGroupId("");
    setNote("");
  }

  async function copyNeighborhoodJoinLink(slug: string) {
    const url = `${window.location.origin}/dashboard/request-access?slug=${encodeURIComponent(slug)}`;

    try {
      await navigator.clipboard.writeText(url);
      addToast(t("share.copySuccess"), "success");
    } catch {
      addToast(t("share.copyError"), "error");
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    resetFormState();
  }

  return (
    <div className="space-y-8" data-testid="dashboard-request-access-root">
      {shareableNeighborhoods.length > 0 ? (
        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
          <div className="space-y-4 px-6 py-6 md:px-8 md:py-7">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
                {t("share.eyebrow")}
              </p>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-stone-900">{t("share.title")}</h2>
                <p className="max-w-3xl text-sm leading-6 text-stone-600">{t("share.subtitle")}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {shareableNeighborhoods.map((neighborhood) => {
                const href = `/dashboard/request-access?slug=${encodeURIComponent(neighborhood.slug)}`;

                return (
                  <article
                    key={neighborhood.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 md:flex-row md:items-center md:justify-between"
                    data-testid={`request-access-share-${neighborhood.id}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{neighborhood.name}</p>
                      <p className="text-xs text-stone-500">/{neighborhood.slug}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={href}
                        className="vh-v3-focus inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        data-testid={`request-access-share-open-${neighborhood.id}`}
                      >
                        {t("share.open")}
                      </Link>
                      <button
                        type="button"
                        className="vh-v3-focus inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                        onClick={() => copyNeighborhoodJoinLink(neighborhood.slug)}
                        data-testid={`request-access-share-copy-${neighborhood.id}`}
                      >
                        <CopyIcon className="h-4 w-4" />
                        {t("share.copy")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.25fr_0.75fr] md:px-8 md:py-7">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              {t("cta.eyebrow")}
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-stone-900">{t("cta.title")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-stone-600">{t("cta.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="vh-v3-focus inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                onClick={() => setDialogOpen(true)}
                data-testid="request-access-open-dialog"
              >
                <SearchIcon className="h-4 w-4" />
                {t("cta.action")}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              {t("cta.checklistTitle")}
            </p>
            <ul className="mt-3 space-y-3 text-sm text-stone-600">
              <li>{t("cta.checklistSlug")}</li>
              <li>{t("cta.checklistGroup")}</li>
              <li>{t("cta.checklistReview")}</li>
            </ul>
          </div>
        </div>
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

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-access-dialog-title"
          data-testid="request-access-dialog"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-600">
                  {t("form.eyebrow")}
                </p>
                <h2
                  id="request-access-dialog-title"
                  className="text-xl font-semibold text-stone-900"
                >
                  {t("form.title")}
                </h2>
                <p className="text-sm text-stone-500">{t("form.subtitle")}</p>
              </div>

              <button
                type="button"
                className="vh-v3-focus rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                onClick={closeDialog}
                data-testid="request-access-dialog-close"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
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
                      className="vh-v3-focus flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100"
                      data-testid="request-access-slug-input"
                      disabled={hasPrefilledSlug}
                    />
                    <button
                      type="submit"
                      className="vh-v3-focus rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={neighborhoodLookup.isLoading || hasPrefilledSlug}
                      data-testid="request-access-slug-submit"
                    >
                      {neighborhoodLookup.isLoading ? t("form.searching") : t("form.search")}
                    </button>
                  </div>
                  {hasPrefilledSlug ? (
                    <p className="text-xs text-stone-500">{t("form.slugLocked")}</p>
                  ) : null}
                </label>
              </form>

              {lookupError ? (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  data-testid="request-access-lookup-error"
                >
                  {lookupError}
                </p>
              ) : null}

              {neighborhoodLookup.data ? (
                <div
                  className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4"
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
                        className="vh-v3-focus w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
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
                        className="vh-v3-focus min-h-28 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                        maxLength={500}
                        data-testid="request-access-note"
                      />
                    </label>
                  </div>
                </div>
              ) : hasActiveLookup ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  {t("form.waiting")}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-6 py-4">
              <button
                type="button"
                className="vh-v3-focus rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                onClick={resetFormState}
                disabled={isCreating}
                data-testid="request-access-reset"
              >
                {t("form.reset")}
              </button>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="vh-v3-focus rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                  onClick={closeDialog}
                  disabled={isCreating}
                  data-testid="request-access-cancel-dialog"
                >
                  {t("form.close")}
                </button>
                <button
                  type="button"
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() =>
                    createRequest.mutate(
                      { groupId: selectedGroupId, note: note.trim() || undefined },
                      {
                        onSuccess: () => {
                          closeDialog();
                        },
                      }
                    )
                  }
                  disabled={!selectedGroupId || isCreating}
                  data-testid="request-access-submit"
                >
                  {isCreating ? t("form.submitting") : t("form.submit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
