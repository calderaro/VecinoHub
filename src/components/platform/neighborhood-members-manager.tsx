"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, PlusIcon, UsersIcon } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

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
}: {
  neighborhoodId: string;
  initialMembers: NeighborhoodMember[];
  userDetailHrefBase?: string | null;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.neighborhoodMembersManager");
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"neighbor" | "neighborhood_admin">("neighbor");
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0;

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        if (left.membershipRole !== right.membershipRole) {
          return left.membershipRole === "neighborhood_admin" ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }),
    [members]
  );

  const addMember = trpc.neighborhoods.addMemberByEmail.useMutation({
    onSuccess: (member) => {
      setMembers((current) => {
        const next = current.filter((item) => item.userId !== member.userId);
        return [member, ...next];
      });
      setEmail("");
      setRole("neighbor");
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

  const isMutating =
    addMember.isPending || updateRole.isPending || updateStatus.isPending;

  function getSystemRoleLabel(value: "user" | "admin" | "platform_admin") {
    return t(`systemRoles.${value}`);
  }

  return (
    <div className="space-y-4" data-testid="platform-neighborhood-members-manager">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-stone-500">
          <UsersIcon className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">{t("title")}</p>
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
          {t("empty")}
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">{t("addDialog.title")}</h3>
            <p className="mt-1 text-sm text-stone-500">{t("addDialog.subtitle")}</p>
            <form
              className="mt-4 space-y-4"
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
              <label className="space-y-2 text-sm text-stone-700">
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

              <label className="space-y-2 text-sm text-stone-700">
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
                    <option value="neighbor">{t("roles.neighbor")}</option>
                    <option value="neighborhood_admin">{t("roles.neighborhood_admin")}</option>
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
    </div>
  );
}
