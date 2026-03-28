"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";

import { formatPortDateTime } from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog, StatusBadge } from "@/components/ui-v3";

type GroupMember = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  systemRole: "user" | "admin" | "platform_admin";
  userStatus: "active" | "inactive";
  membershipRole: "group_member" | "group_admin";
  membershipStatus: "active" | "inactive";
};

type GroupInvite = {
  id: string;
  email: string;
  role: "group_member" | "group_admin";
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  expiresAt: Date;
  createdAt: Date;
  lastSentAt: Date;
  invitedByName: string | null;
};

type GroupAccessRequest = {
  id: string;
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

type GroupMembersTab = "members" | "invites" | "requests";

export function GroupMembers({
  groupId,
  canManage,
  members,
  invites,
  accessRequests,
  viewerUserId,
  viewerMembershipRole,
  timeZone,
}: {
  groupId: string;
  canManage: boolean;
  members: GroupMember[];
  invites: GroupInvite[];
  accessRequests: GroupAccessRequest[];
  viewerUserId: string;
  viewerMembershipRole: "group_member" | "group_admin" | null;
  timeZone: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const locale = useLocale();
  const t = useTranslations("dashboard.groupMembers");
  const [email, setEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"group_member" | "group_admin">(
    "group_member"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<GroupMember | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [activeAccessRequestId, setActiveAccessRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupMembersTab>("members");
  const canSubmit = email.trim().length > 0;

  function formatDate(value: Date) {
    return formatPortDateTime(value, timeZone, locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const createInvite = trpc.groupInvites.create.useMutation({
    onSuccess: () => {
      addToast(t("toasts.invited"), "success");
      setEmail("");
      setNewMemberRole("group_member");
      setAddError(null);
      setAddOpen(false);
      router.refresh();
    },
    onError: (err) => {
      setAddError(err.message);
      addToast(err.message, "error");
    },
  });

  const resendInvite = trpc.groupInvites.resend.useMutation({
    onSuccess: () => {
      setActiveInviteId(null);
      addToast(t("toasts.resent"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveInviteId(null);
      addToast(err.message, "error");
    },
  });

  const cancelInvite = trpc.groupInvites.cancel.useMutation({
    onSuccess: () => {
      setActiveInviteId(null);
      addToast(t("toasts.cancelled"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveInviteId(null);
      addToast(err.message, "error");
    },
  });

  const updateRole = trpc.groups.setMemberRole.useMutation({
    onSuccess: () => {
      addToast(t("toasts.roleUpdated"), "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      addToast(t("toasts.removed"), "success");
      setPendingRemove(null);
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const leaveGroup = trpc.groups.leave.useMutation({
    onSuccess: () => {
      addToast(t("toasts.left"), "success");
      setLeaveOpen(false);
      router.push("/dashboard");
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const approveAccessRequest = trpc.groupAccessRequests.approve.useMutation({
    onSuccess: () => {
      setActiveAccessRequestId(null);
      addToast(t("toasts.requestApproved"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveAccessRequestId(null);
      addToast(err.message, "error");
    },
  });

  const rejectAccessRequest = trpc.groupAccessRequests.reject.useMutation({
    onSuccess: () => {
      setActiveAccessRequestId(null);
      addToast(t("toasts.requestRejected"), "success");
      router.refresh();
    },
    onError: (err) => {
      setActiveAccessRequestId(null);
      addToast(err.message, "error");
    },
  });

  const sortedMembers = [...members].sort((left, right) => {
    if (left.membershipRole !== right.membershipRole) {
      return left.membershipRole === "group_admin" ? -1 : 1;
    }

    return (left.username ?? left.name).localeCompare(right.username ?? right.name);
  });
  const viewerMembership = members.find(
    (member) => member.id === viewerUserId && member.membershipStatus === "active"
  );
  const canLeaveGroup = Boolean(viewerMembership && viewerMembershipRole);
  const tabs: Array<{
    key: GroupMembersTab;
    label: string;
    count: number;
  }> = [
    { key: "members", label: t("tabs.members"), count: sortedMembers.length },
    ...(canManage
      ? [
          { key: "invites" as const, label: t("tabs.invites"), count: invites.length },
          { key: "requests" as const, label: t("tabs.requests"), count: accessRequests.length },
        ]
      : []),
  ];

  const isMutating =
    createInvite.isPending ||
    resendInvite.isPending ||
    cancelInvite.isPending ||
    approveAccessRequest.isPending ||
    rejectAccessRequest.isPending ||
    updateRole.isPending ||
    removeMember.isPending ||
    leaveGroup.isPending;

  return (
    <div className="mt-4 space-y-5">
      <div
        className="flex flex-wrap items-center gap-3"
        role="tablist"
        aria-label={t("title")}
        data-testid="group-members-tabs"
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
              id={`group-members-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`group-members-panel-${tab.key}`}
              data-testid={`group-members-tab-${tab.key}`}
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

      {activeTab === "invites" && canManage ? (
        <section
          className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm"
          role="tabpanel"
          id="group-members-panel-invites"
          aria-labelledby="group-members-tab-invites"
          data-testid="group-members-panel-invites"
        >
          <section className="space-y-3" data-testid="group-invites-list">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
                {t("invites.title")}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  className="vh-v3-focus rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  type="button"
                  data-testid="group-members-add"
                  onClick={() => {
                    setAddError(null);
                    setAddOpen(true);
                  }}
                >
                  {t("add")}
                </button>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                  {t("invites.count", { count: invites.length })}
                </span>
              </div>
            </div>

            {invites.length === 0 ? (
              <p className="text-sm text-stone-500">{t("invites.empty")}</p>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const inviteBusy =
                    activeInviteId === invite.id &&
                    (resendInvite.isPending || cancelInvite.isPending);

                  return (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3"
                      data-testid={`group-invite-row-${invite.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-900">{invite.email}</p>
                        <p className="text-xs text-stone-500">
                          {t("invites.expires", {
                            date: formatDate(invite.expiresAt),
                          })}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          variant={invite.role}
                          label={t(`roles.${invite.role}`)}
                        />
                        <button
                          className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => {
                            setActiveInviteId(invite.id);
                            resendInvite.mutate({ inviteId: invite.id });
                          }}
                          disabled={isMutating}
                          data-testid={`group-invite-resend-${invite.id}`}
                        >
                          {inviteBusy && resendInvite.isPending
                            ? t("invites.resending")
                            : t("invites.resend")}
                        </button>
                        <button
                          className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => {
                            setActiveInviteId(invite.id);
                            cancelInvite.mutate({ inviteId: invite.id });
                          }}
                          disabled={isMutating}
                          data-testid={`group-invite-cancel-${invite.id}`}
                        >
                          {inviteBusy && cancelInvite.isPending
                            ? t("invites.cancelling")
                            : t("invites.cancel")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === "requests" && canManage ? (
        <section
          className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm"
          role="tabpanel"
          id="group-members-panel-requests"
          aria-labelledby="group-members-tab-requests"
          data-testid="group-members-panel-requests"
        >
          <section className="space-y-3" data-testid="group-access-requests-list">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
                {t("requests.title")}
              </p>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                {t("requests.count", { count: accessRequests.length })}
              </span>
            </div>

            {accessRequests.length === 0 ? (
              <p className="text-sm text-stone-500">{t("requests.empty")}</p>
            ) : (
              <div className="space-y-3">
                {accessRequests.map((request) => {
                  const requestBusy =
                    activeAccessRequestId === request.id &&
                    (approveAccessRequest.isPending || rejectAccessRequest.isPending);

                  return (
                    <div
                      key={request.id}
                      className="space-y-3 rounded-lg border border-stone-200 bg-white px-3 py-3"
                      data-testid={`group-access-request-row-${request.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-900">
                            {request.requesterName ?? request.requesterEmail}
                          </p>
                          <p className="text-xs text-stone-500">{request.requesterEmail}</p>
                        </div>

                        <StatusBadge variant="pending" label={t("requests.pending")} />
                      </div>

                      <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
                        <p>{t("requests.createdOn", { date: formatDate(request.createdAt) })}</p>
                        <p>{t("requests.expiresOn", { date: formatDate(request.expiresAt) })}</p>
                      </div>

                      {request.note ? (
                        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                            {t("requests.note")}
                          </p>
                          <p className="mt-1 text-sm text-stone-700">{request.note}</p>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => {
                            setActiveAccessRequestId(request.id);
                            rejectAccessRequest.mutate({ requestId: request.id });
                          }}
                          disabled={isMutating}
                          data-testid={`group-access-request-reject-${request.id}`}
                        >
                          {requestBusy && rejectAccessRequest.isPending
                            ? t("requests.rejecting")
                            : t("requests.reject")}
                        </button>
                        <button
                          className="vh-v3-focus rounded-md bg-teal-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => {
                            setActiveAccessRequestId(request.id);
                            approveAccessRequest.mutate({ requestId: request.id });
                          }}
                          disabled={isMutating}
                          data-testid={`group-access-request-approve-${request.id}`}
                        >
                          {requestBusy && approveAccessRequest.isPending
                            ? t("requests.approving")
                            : t("requests.approve")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === "members" ? (
        <section
          className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm"
          role="tabpanel"
          id="group-members-panel-members"
          aria-labelledby="group-members-tab-members"
          data-testid="group-members-panel-members"
        >
          <div className="space-y-5">
            {sortedMembers.length === 0 ? (
              <p className="text-sm text-stone-500">{t("empty")}</p>
            ) : (
              <div data-testid="dashboard-members-list" className="space-y-3">
                {sortedMembers.map((member) => {
                  const displayName = member.username ?? member.name;
                  const secondary = member.username ? member.name : member.email;

                  return (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5"
                      data-testid={`group-members-row-${member.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {member.image ? (
                          <Image
                            className="h-9 w-9 rounded-full border border-stone-200 object-cover"
                            src={member.image}
                            alt={displayName}
                            width={36}
                            height={36}
                            sizes="36px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                            {(displayName?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-stone-900">{displayName}</p>
                          <p className="text-xs text-stone-500">{secondary}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canManage && member.id !== viewerUserId ? (
                          <div className="relative">
                            <select
                              className="appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 outline-none transition-colors focus:border-teal-400"
                              value={member.membershipRole}
                              onChange={(event) =>
                                updateRole.mutate({
                                  groupId,
                                  userId: member.id,
                                  role: event.target.value as "group_member" | "group_admin",
                                })
                              }
                              disabled={isMutating}
                              data-testid={`group-members-role-${member.id}`}
                            >
                              <option value="group_member">{t("roles.group_member")}</option>
                              <option value="group_admin">{t("roles.group_admin")}</option>
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
                          </div>
                        ) : (
                          <StatusBadge
                            variant={member.membershipRole}
                            label={t(`roles.${member.membershipRole}`)}
                          />
                        )}

                        <StatusBadge
                          variant={member.membershipStatus}
                          label={t(`statuses.${member.membershipStatus}`)}
                        />

                        {canManage && member.id !== viewerUserId ? (
                          <button
                            className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                            type="button"
                            onClick={() => setPendingRemove(member)}
                            disabled={removeMember.isPending}
                            data-testid={`group-members-remove-${member.id}`}
                          >
                            {t("remove")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canLeaveGroup ? (
              <section
                className="rounded-xl border border-red-200 bg-red-50/60 p-4"
                data-testid="group-members-self-leave"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-stone-900">{t("leave.title")}</p>
                    <p className="text-sm text-stone-600">{t("leave.subtitle")}</p>
                    {viewerMembershipRole === "group_admin" ? (
                      <p className="text-xs text-stone-500">{t("leave.adminHint")}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      variant={viewerMembershipRole ?? "group_member"}
                      label={t(`roles.${viewerMembershipRole ?? "group_member"}`)}
                    />
                    <button
                      className="vh-v3-focus rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() => setLeaveOpen(true)}
                      disabled={isMutating}
                      data-testid="group-members-leave"
                    >
                      {t("leave.action")}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {t("addDialog.title")}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {t("addDialog.subtitle")}
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setAddError(null);
                if (!canSubmit) {
                  addToast(t("addDialog.emailRequired"), "error");
                  return;
                }
                createInvite.mutate({ groupId, email, role: newMemberRole });
              }}
            >
              <label className="space-y-2 text-sm text-stone-700">
                <span>{t("addDialog.emailLabel")}</span>
                <input
                  className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAddError(null);
                  }}
                  placeholder={t("addDialog.emailPlaceholder")}
                  type="email"
                  required
                  data-testid="group-members-add-email"
                />
              </label>

              <label className="space-y-2 text-sm text-stone-700">
                <span>{t("addDialog.roleLabel")}</span>
                <div className="relative">
                  <select
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3.5 pr-8 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={newMemberRole}
                    onChange={(event) =>
                      setNewMemberRole(event.target.value as "group_member" | "group_admin")
                    }
                    data-testid="group-members-add-role"
                  >
                    <option value="group_member">{t("roles.group_member")}</option>
                    <option value="group_admin">{t("roles.group_admin")}</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </label>

              {addError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {addError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="vh-v3-focus rounded-lg px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                  type="button"
                  data-testid="group-members-add-cancel"
                  onClick={() => {
                    setAddError(null);
                    setAddOpen(false);
                  }}
                  disabled={createInvite.isPending}
                >
                  {t("addDialog.cancel")}
                </button>
                <button
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  data-testid="group-members-add-submit"
                  disabled={!canSubmit || createInvite.isPending}
                >
                  {createInvite.isPending ? t("addDialog.adding") : t("addDialog.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title={t("removeDialog.title")}
          body={t("removeDialog.body", {
            name: pendingRemove.username ?? pendingRemove.name,
          })}
          cancelLabel={t("removeDialog.cancel")}
          confirmLabel={
            removeMember.isPending ? t("removeDialog.removing") : t("removeDialog.remove")
          }
          onCancel={() => setPendingRemove(null)}
          onConfirm={() =>
            removeMember.mutate({
              groupId,
              userId: pendingRemove.id,
            })
          }
          isLoading={removeMember.isPending}
          variant="danger"
        />
      ) : null}

      {leaveOpen ? (
        <ConfirmDialog
          title={t("leaveDialog.title")}
          body={t("leaveDialog.body")}
          cancelLabel={t("leaveDialog.cancel")}
          confirmLabel={leaveGroup.isPending ? t("leaveDialog.leaving") : t("leaveDialog.leave")}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => leaveGroup.mutate({ groupId })}
          isLoading={leaveGroup.isPending}
          variant="danger"
        />
      ) : null}
    </div>
  );
}
