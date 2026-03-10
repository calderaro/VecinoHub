"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, PlusIcon, UsersIcon } from "lucide-react";

import { StatusChip } from "@/components/dashboard-v2";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog, StatusBadge } from "@/components/ui-v3";

type NeighborhoodMember = {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  systemRole: "user" | "admin" | "platform_admin";
  membershipRole: "neighbor" | "neighborhood_admin";
  membershipStatus: "active" | "inactive";
  createdAt: Date | string;
};

export function NeighborhoodMembersManager({
  neighborhoodId,
  initialMembers,
  userDetailHrefBase = `/admin/${neighborhoodId}/users`,
  visibleRoles,
  assignableRoles = ["neighbor", "neighborhood_admin"],
  editableRoles = ["neighbor", "neighborhood_admin"],
  heading,
  emptyMessage,
  itemActionsMode = "inline",
}: {
  neighborhoodId: string;
  initialMembers: NeighborhoodMember[];
  userDetailHrefBase?: string | null;
  visibleRoles?: Array<NeighborhoodMember["membershipRole"]>;
  assignableRoles?: Array<NeighborhoodMember["membershipRole"]>;
  editableRoles?: Array<NeighborhoodMember["membershipRole"]>;
  heading?: string;
  emptyMessage?: string;
  itemActionsMode?: "inline" | "dialog";
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.neighborhoodMembersManager");
  const defaultRole = assignableRoles[0] ?? "neighbor";
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"neighbor" | "neighborhood_admin">(defaultRole);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<NeighborhoodMember | null>(null);
  const [editRole, setEditRole] = useState<NeighborhoodMember["membershipRole"]>("neighbor");
  const [editStatus, setEditStatus] = useState<NeighborhoodMember["membershipStatus"]>("active");
  const [editError, setEditError] = useState<string | null>(null);
  const [removeMember, setRemoveMember] = useState<NeighborhoodMember | null>(null);
  const canSubmit = email.trim().length > 0;

  const sortedMembers = useMemo(
    () =>
      [...members]
        .filter((member) =>
          visibleRoles ? visibleRoles.includes(member.membershipRole) : true
        )
        .sort((left, right) => {
          if (left.membershipRole !== right.membershipRole) {
            return left.membershipRole === "neighborhood_admin" ? -1 : 1;
          }

          return left.name.localeCompare(right.name);
        }),
    [members, visibleRoles]
  );

  const addMember = trpc.neighborhoods.addMemberByEmail.useMutation({
    onSuccess: (member) => {
      setMembers((current) => {
        const next = current.filter((item) => item.userId !== member.userId);
        return [member, ...next];
      });
      setEmail("");
      setRole(defaultRole);
      setAddError(null);
      setAddOpen(false);
      addToast(t("toasts.added"), "success");
      router.refresh();
    },
    onError: (error) => {
      setAddError(error.message);
      addToast(error.message, "error");
    },
  });

  const updateRole = trpc.neighborhoods.setMemberRole.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) =>
        current.map((member) =>
          member.userId === variables.userId
            ? {
                ...member,
                membershipRole: variables.role,
                membershipStatus: "active",
              }
            : member
        )
      );
      addToast(t("toasts.roleUpdated"), "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const updateStatus = trpc.neighborhoods.updateMembershipStatus.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) =>
        current.map((member) =>
          member.userId === variables.userId
            ? {
                ...member,
                membershipStatus: variables.status,
              }
            : member
        )
      );
      addToast(t("toasts.statusUpdated"), "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const updateMember = trpc.neighborhoods.updateMember.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) =>
        current.map((member) =>
          member.userId === variables.userId
            ? {
                ...member,
                membershipRole: variables.role ?? member.membershipRole,
                membershipStatus: variables.status ?? member.membershipStatus,
              }
            : member
        )
      );
      setEditError(null);
      setEditMember(null);
      addToast(t("toasts.updated"), "success");
      router.refresh();
    },
    onError: (error) => {
      setEditError(error.message);
      addToast(error.message, "error");
    },
  });

  const removeNeighborhoodMember = trpc.neighborhoods.removeMember.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) => current.filter((member) => member.userId !== variables.userId));
      setRemoveMember(null);
      addToast(t("toasts.removed"), "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const isMutating =
    addMember.isPending ||
    updateRole.isPending ||
    updateStatus.isPending ||
    updateMember.isPending ||
    removeNeighborhoodMember.isPending;

  function getSystemRoleLabel(value: "user" | "admin" | "platform_admin") {
    return t(`systemRoles.${value}`);
  }

  function openEditDialog(member: NeighborhoodMember) {
    setEditMember(member);
    setEditRole(member.membershipRole);
    setEditStatus(member.membershipStatus);
    setEditError(null);
  }

  return (
    <div className="space-y-4" data-testid="platform-neighborhood-members-manager">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-stone-500">
          <UsersIcon className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">
            {heading ?? t("title")}
          </p>
        </div>
        <button
          type="button"
          className="vh-v3-focus inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
          data-testid="platform-neighborhood-add-member"
          onClick={() => {
            setAddError(null);
            setAddOpen(true);
          }}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t("add")}
        </button>
      </div>

      {sortedMembers.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
          data-testid="platform-neighborhood-members-empty"
        >
          {emptyMessage ?? t("empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-3"
              data-testid={`platform-neighborhood-member-${member.userId}`}
            >
              <div className="min-w-0">
                {userDetailHrefBase ? (
                  <Link
                    href={`${userDetailHrefBase}/${member.userId}`}
                    className="truncate text-sm font-medium text-stone-900 transition-colors hover:text-teal-700"
                  >
                    {member.name}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-medium text-stone-900">{member.name}</p>
                )}
                <p className="truncate text-xs text-stone-400">
                  {member.email}
                  {member.username ? ` · @${member.username}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  variant={
                    member.systemRole === "platform_admin"
                      ? "platform_admin"
                      : member.systemRole === "admin"
                        ? "admin"
                        : "user"
                  }
                  label={getSystemRoleLabel(member.systemRole)}
                />

                {itemActionsMode === "dialog" ? (
                  <>
                    <StatusChip
                      variant={member.membershipRole}
                      label={t(`roles.${member.membershipRole}`)}
                    />
                    <StatusBadge
                      variant={member.membershipStatus}
                      label={
                        member.membershipStatus === "active"
                          ? t("statuses.active")
                          : t("statuses.inactive")
                      }
                    />
                    <button
                      type="button"
                      className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
                      data-testid={`platform-neighborhood-member-edit-${member.userId}`}
                      onClick={() => openEditDialog(member)}
                      disabled={isMutating}
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      type="button"
                      className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      data-testid={`platform-neighborhood-member-remove-${member.userId}`}
                      onClick={() => setRemoveMember(member)}
                      disabled={isMutating}
                    >
                      {t("actions.remove")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        className="appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 outline-none transition-colors focus:border-teal-400"
                        value={member.membershipRole}
                        onChange={(event) =>
                          updateRole.mutate({
                            neighborhoodId,
                            userId: member.userId,
                            role: event.target.value as "neighbor" | "neighborhood_admin",
                          })
                        }
                        disabled={isMutating}
                        data-testid={`platform-neighborhood-member-role-${member.userId}`}
                      >
                        <option value="neighbor">{t("roles.neighbor")}</option>
                        <option value="neighborhood_admin">{t("roles.neighborhood_admin")}</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
                    </div>

                    <div className="relative">
                      <select
                        className="appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 outline-none transition-colors focus:border-teal-400"
                        value={member.membershipStatus}
                        onChange={(event) =>
                          updateStatus.mutate({
                            neighborhoodId,
                            userId: member.userId,
                            status: event.target.value as "active" | "inactive",
                          })
                        }
                        disabled={isMutating}
                        data-testid={`platform-neighborhood-member-status-${member.userId}`}
                      >
                        <option value="active">{t("statuses.active")}</option>
                        <option value="inactive">{t("statuses.inactive")}</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
                    </div>

                    <StatusBadge
                      variant={member.membershipStatus}
                      label={
                        member.membershipStatus === "active"
                          ? t("statuses.active")
                          : t("statuses.inactive")
                      }
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">{t("editDialog.title")}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {t("editDialog.subtitle", { name: editMember.name })}
            </p>
            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setEditError(null);
                updateMember.mutate({
                  neighborhoodId,
                  userId: editMember.userId,
                  role: editRole,
                  status: editStatus,
                });
              }}
            >
              <label className="block space-y-2.5 text-sm text-stone-700">
                <span>{t("editDialog.roleLabel")}</span>
                <div className="relative">
                  <select
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3.5 pr-8 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={editRole}
                    onChange={(event) =>
                      setEditRole(event.target.value as "neighbor" | "neighborhood_admin")
                    }
                    data-testid="platform-neighborhood-edit-member-role"
                  >
                    {editableRoles.map((editableRole) => (
                      <option key={editableRole} value={editableRole}>
                        {t(`roles.${editableRole}`)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </label>

              <label className="block space-y-2.5 pt-1 text-sm text-stone-700">
                <span>{t("editDialog.statusLabel")}</span>
                <div className="relative">
                  <select
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3.5 pr-8 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as "active" | "inactive")
                    }
                    data-testid="platform-neighborhood-edit-member-status"
                  >
                    <option value="active">{t("statuses.active")}</option>
                    <option value="inactive">{t("statuses.inactive")}</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </label>

              {editError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {editError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="vh-v3-focus rounded-lg px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                  data-testid="platform-neighborhood-edit-member-cancel"
                  onClick={() => {
                    setEditError(null);
                    setEditMember(null);
                  }}
                  disabled={updateMember.isPending}
                >
                  {t("editDialog.cancel")}
                </button>
                <button
                  type="submit"
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="platform-neighborhood-edit-member-submit"
                  disabled={updateMember.isPending}
                >
                  {updateMember.isPending ? t("editDialog.saving") : t("editDialog.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">{t("addDialog.title")}</h3>
            <p className="mt-1 text-sm text-stone-500">{t("addDialog.subtitle")}</p>
            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setAddError(null);
                if (!canSubmit) {
                  addToast(t("addDialog.emailRequired"), "error");
                  return;
                }
                addMember.mutate({
                  neighborhoodId,
                  email: email.trim(),
                  role,
                });
              }}
              data-testid="platform-neighborhood-add-member-form"
            >
              <label className="block space-y-2.5 text-sm text-stone-700">
                <span>{t("addDialog.emailLabel")}</span>
                <input
                  className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAddError(null);
                  }}
                  placeholder={t("addDialog.emailPlaceholder")}
                  required
                  data-testid="platform-neighborhood-add-member-email"
                />
              </label>

              <label className="block space-y-2.5 pt-1 text-sm text-stone-700">
                <span>{t("addDialog.roleLabel")}</span>
                <div className="relative">
                  <select
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3.5 pr-8 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as "neighbor" | "neighborhood_admin")
                    }
                    data-testid="platform-neighborhood-add-member-role"
                  >
                    {assignableRoles.map((assignableRole) => (
                      <option key={assignableRole} value={assignableRole}>
                        {t(`roles.${assignableRole}`)}
                      </option>
                    ))}
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
                  type="button"
                  className="vh-v3-focus rounded-lg px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                  data-testid="platform-neighborhood-add-member-cancel"
                  onClick={() => {
                    setAddError(null);
                    setAddOpen(false);
                  }}
                  disabled={addMember.isPending}
                >
                  {t("addDialog.cancel")}
                </button>
                <button
                  type="submit"
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="platform-neighborhood-add-member-submit"
                  disabled={!canSubmit || addMember.isPending}
                >
                  {addMember.isPending ? t("addDialog.saving") : t("addDialog.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {removeMember ? (
        <ConfirmDialog
          title={t("removeDialog.title")}
          body={t("removeDialog.body", { name: removeMember.name })}
          cancelLabel={t("removeDialog.cancel")}
          confirmLabel={
            removeNeighborhoodMember.isPending
              ? t("removeDialog.removing")
              : t("removeDialog.remove")
          }
          onCancel={() => setRemoveMember(null)}
          onConfirm={() =>
            removeNeighborhoodMember.mutate({
              neighborhoodId,
              userId: removeMember.userId,
            })
          }
          isLoading={removeNeighborhoodMember.isPending}
          variant="danger"
        />
      ) : null}
    </div>
  );
}
