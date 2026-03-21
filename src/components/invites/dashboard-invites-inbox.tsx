"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";
import { trpc } from "@/lib/trpc";

type InviteItem = {
  id: string;
  groupId: string;
  groupName: string;
  neighborhoodId: string;
  neighborhoodName: string;
  email: string;
  role: "group_member" | "group_admin";
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  invitedByName: string | null;
};

type DashboardInvitesInboxProps = {
  pending: InviteItem[];
  history: InviteItem[];
  highlightedInviteId?: string | null;
  showMismatchWarning?: boolean;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function DashboardInvitesInbox({
  pending,
  history,
  highlightedInviteId,
  showMismatchWarning = false,
}: DashboardInvitesInboxProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.invites");
  const { addToast } = useToast();
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);

  const acceptInvite = trpc.groupInvites.accept.useMutation({
    onSuccess: (result) => {
      addToast(t("toasts.accepted"), "success");
      router.push(`/dashboard/${result.groupId}`);
      router.refresh();
    },
    onError: (error) => {
      setActiveInviteId(null);
      addToast(error.message, "error");
    },
  });

  const rejectInvite = trpc.groupInvites.reject.useMutation({
    onSuccess: () => {
      setActiveInviteId(null);
      addToast(t("toasts.rejected"), "success");
      router.refresh();
    },
    onError: (error) => {
      setActiveInviteId(null);
      addToast(error.message, "error");
    },
  });

  const isMutating = acceptInvite.isPending || rejectInvite.isPending;

  return (
    <div className="space-y-6" data-testid="dashboard-invites-root">
      {showMismatchWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("mismatchWarning")}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{t("pendingTitle")}</h2>
            <p className="text-sm text-stone-500">{t("pendingSubtitle")}</p>
          </div>
          <StatusBadge variant="active" label={t("pendingCount", { count: pending.length })} />
        </div>

        {pending.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center text-sm text-stone-500"
            data-testid="dashboard-invites-empty"
          >
            {t("empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((invite) => {
              const isActive = activeInviteId === invite.id && isMutating;
              const isHighlighted = highlightedInviteId === invite.id;

              return (
                <article
                  key={invite.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm ${
                    isHighlighted ? "border-teal-300 ring-2 ring-teal-100" : "border-stone-200"
                  }`}
                  data-testid={`dashboard-invite-row-${invite.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
                        {invite.neighborhoodName}
                      </p>
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{invite.groupName}</h3>
                        <p className="text-sm text-stone-500">
                          {t("invitedBy", {
                            name: invite.invitedByName ?? t("unknownInviter"),
                          })}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      variant={invite.role}
                      label={t(`roles.${invite.role}`)}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                    <p>{t("sentOn", { date: formatDate(invite.createdAt) })}</p>
                    <p>{t("expiresOn", { date: formatDate(invite.expiresAt) })}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setActiveInviteId(invite.id);
                        rejectInvite.mutate({ inviteId: invite.id });
                      }}
                      disabled={isMutating}
                      data-testid={`dashboard-invite-reject-${invite.id}`}
                    >
                      {isActive && rejectInvite.isPending ? t("rejecting") : t("reject")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setActiveInviteId(invite.id);
                        acceptInvite.mutate({ inviteId: invite.id });
                      }}
                      disabled={isMutating}
                      data-testid={`dashboard-invite-accept-${invite.id}`}
                    >
                      {isActive && acceptInvite.isPending ? t("accepting") : t("accept")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{t("historyTitle")}</h2>
            <p className="text-sm text-stone-500">{t("historySubtitle")}</p>
          </div>
          <div className="space-y-3">
            {history.map((invite) => (
              <article
                key={invite.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{invite.groupName}</p>
                    <p className="text-xs text-stone-500">{invite.neighborhoodName}</p>
                  </div>
                  <StatusBadge
                    variant={invite.status === "accepted" ? "active" : "inactive"}
                    label={t(`statuses.${invite.status}`)}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
