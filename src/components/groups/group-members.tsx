"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";

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

export function GroupMembers({
  groupId,
  canManage,
  members,
}: {
  groupId: string;
  canManage: boolean;
  members: GroupMember[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("dashboard.groupMembers");
  const [email, setEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"group_member" | "group_admin">(
    "group_member"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<GroupMember | null>(null);
  const canSubmit = email.trim().length > 0;

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      addToast(t("toasts.added"), "success");
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

  const sortedMembers = [...members].sort((left, right) => {
    if (left.membershipRole !== right.membershipRole) {
      return left.membershipRole === "group_admin" ? -1 : 1;
    }

    return (left.username ?? left.name).localeCompare(right.username ?? right.name);
  });

  const isMutating =
    addMember.isPending || updateRole.isPending || removeMember.isPending;

  return (
    <div className="mt-4 space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
            {t("title")}
          </p>
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
        </div>
      ) : null}

      {sortedMembers.length === 0 ? (
        <p className="text-sm text-stone-500">{t("empty")}</p>
      ) : (
        sortedMembers.map((member) => {
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
                {canManage ? (
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

                {canManage ? (
                  <button
                    className="vh-v3-focus rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    type="button"
                    onClick={() => setPendingRemove(member)}
                    disabled={removeMember.isPending}
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

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
                addMember.mutate({ groupId, email, role: newMemberRole });
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
                  disabled={addMember.isPending}
                >
                  {t("addDialog.cancel")}
                </button>
                <button
                  className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  data-testid="group-members-add-submit"
                  disabled={!canSubmit || addMember.isPending}
                >
                  {addMember.isPending ? t("addDialog.adding") : t("addDialog.add")}
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
    </div>
  );
}
