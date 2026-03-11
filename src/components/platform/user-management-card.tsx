"use client";

import { useState, type FormEvent } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc";

type PlatformUserManagementCardProps = {
  userId: string;
  initialRole: "user" | "admin" | "platform_admin";
  initialStatus: "active" | "inactive";
};

export function PlatformUserManagementCard({
  userId,
  initialRole,
  initialStatus,
}: PlatformUserManagementCardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("platform.userManagement");
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);

  const updateRole = trpc.users.updateRole.useMutation();
  const updateStatus = trpc.users.updateStatus.useMutation();
  const isPending = updateRole.isPending || updateStatus.isPending;
  const hasChanges = role !== initialRole || status !== initialStatus;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      addToast(t("toasts.noChanges"), "info");
      return;
    }

    let didMutate = false;

    try {
      if (role !== initialRole) {
        await updateRole.mutateAsync({ userId, role });
        didMutate = true;
      }

      if (status !== initialStatus) {
        await updateStatus.mutateAsync({ userId, status });
        didMutate = true;
      }

      addToast(t("toasts.saved"), "success");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.error");
      addToast(message, "error");

      if (didMutate) {
        router.refresh();
      }
    }
  }

  return (
    <section
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      data-testid="platform-user-management"
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("roleLabel")}
            </span>
            <div className="relative">
              <select
                className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "user" | "admin" | "platform_admin")
                }
                disabled={isPending}
                data-testid="platform-user-role"
              >
                <option value="user">{t("roles.user")}</option>
                <option value="admin">{t("roles.admin")}</option>
                <option value="platform_admin">{t("roles.platform_admin")}</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("statusLabel")}
            </span>
            <div className="relative">
              <select
                className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "inactive")
                }
                disabled={isPending}
                data-testid="platform-user-status"
              >
                <option value="active">{t("statuses.active")}</option>
                <option value="inactive">{t("statuses.inactive")}</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-stone-400">{t("hint")}</p>
          <button
            type="submit"
            className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            disabled={!hasChanges || isPending}
            data-testid="platform-user-save"
          >
            {isPending ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </section>
  );
}
