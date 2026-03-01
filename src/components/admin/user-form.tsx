"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, ChevronDownIcon, ShieldIcon, UserIcon } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type UserFormProps = {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
};

export function UserForm({ userId, name, email, username, role, status }: UserFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.userForm");
  const tUsers = useTranslations("admin.usersTable");

  const [nextRole, setNextRole] = useState<"user" | "admin">(role);
  const [nextStatus, setNextStatus] = useState<"active" | "inactive">(status);
  const [error, setError] = useState<string | null>(null);

  const updateRole = trpc.users.updateRole.useMutation();
  const updateStatus = trpc.users.updateStatus.useMutation();

  const isDisabled = updateRole.isPending || updateStatus.isPending;

  async function handleSubmit() {
    setError(null);

    try {
      if (nextRole !== role) {
        await updateRole.mutateAsync({ userId, role: nextRole });
      }
      if (nextStatus !== status) {
        await updateStatus.mutateAsync({ userId, status: nextStatus });
      }

      addToast(t("updatedToast"), "success");
      router.push(`/admin/users/${userId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveError");
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="user-form-root">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">{t("saveErrorTitle")}</p>
            <p className="mt-0.5 text-xs text-red-500">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-6">
        <form
          className="min-w-0 flex-1 space-y-4 pb-24 sm:pb-0"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSubmit();
          }}
        >
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <UserIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                {t("accountSection")}
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-stone-400">{t("fields.name")}</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{name}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">{t("fields.email")}</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-400">{t("fields.username")}</p>
                <p className="mt-1 text-sm font-medium text-stone-900">{username ?? t("notSet")}</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <ShieldIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                {t("permissionsSection")}
              </h2>
            </div>
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div>
                <label htmlFor="user-role" className="mb-1.5 block text-sm font-medium text-stone-700">
                  {t("fields.role")}
                </label>
                <div className="relative">
                  <select
                    id="user-role"
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={nextRole}
                    onChange={(event) => setNextRole(event.target.value as "user" | "admin")}
                    disabled={isDisabled}
                    data-testid="user-form-role"
                  >
                    <option value="user">{tUsers("roles.user")}</option>
                    <option value="admin">{tUsers("roles.admin")}</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <div>
                <label htmlFor="user-status" className="mb-1.5 block text-sm font-medium text-stone-700">
                  {t("fields.status")}
                </label>
                <div className="relative">
                  <select
                    id="user-status"
                    className="vh-v3-focus w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as "active" | "inactive")}
                    disabled={isDisabled}
                    data-testid="user-form-status"
                  >
                    <option value="active">{tUsers("statuses.active")}</option>
                    <option value="inactive">{tUsers("statuses.inactive")}</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                </div>
              </div>
            </div>
          </section>

          <div className="hidden items-center justify-between pt-2 sm:flex">
            <button
              type="button"
              onClick={() => router.push(`/admin/users/${userId}`)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
              disabled={isDisabled}
            >
              {t("cancel")}
            </button>
            <button
              className="vh-v3-focus rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isDisabled}
              data-testid="user-form-submit"
            >
              {isDisabled ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                {t("previewTitle")}
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="space-y-2 border-b border-stone-100 pb-3">
                <p className="text-sm font-semibold text-stone-900">{name}</p>
                <p className="text-xs text-stone-400">{email}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{t("fields.role")}</span>
                <StatusBadge variant={nextRole} label={tUsers(`roles.${nextRole}`)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{t("fields.status")}</span>
                <StatusBadge variant={nextStatus} label={tUsers(`statuses.${nextStatus}`)} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => router.push(`/admin/users/${userId}`)}
          disabled={isDisabled}
          className="flex-1 rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-600 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          data-testid="user-form-submit-mobile"
        >
          {isDisabled ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
