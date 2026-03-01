"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircleIcon,
  MapPinIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type GroupFormProps = {
  mode: "create" | "edit";
  groupId?: string;
  initialName?: string;
  initialAddress?: string | null;
  initialAdminUserId?: string;
  defaultAdminUserId?: string;
};

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-400";

export function GroupForm({
  mode,
  groupId,
  initialName = "",
  initialAddress = "",
  initialAdminUserId = "",
  defaultAdminUserId = "",
}: GroupFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const tPage = useTranslations("admin.groupFormPage");
  const t = useTranslations("admin.groupForm");

  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [adminUserId, setAdminUserId] = useState(
    initialAdminUserId || defaultAdminUserId
  );
  const [error, setError] = useState<string | null>(null);

  const createGroup = trpc.groups.create.useMutation();
  const updateGroup = trpc.groups.update.useMutation();
  const assignAdmin = trpc.groups.assignAdmin.useMutation();

  const isValid = name.trim().length > 0 && adminUserId.trim().length > 0;
  const isDisabled =
    createGroup.isPending || updateGroup.isPending || assignAdmin.isPending;
  const cancelHref = mode === "create" ? "/admin/groups" : `/admin/groups/${groupId ?? ""}`;

  async function handleSubmit() {
    setError(null);

    if (!isValid) {
      setError(t("validationError"));
      return;
    }

    try {
      if (mode === "create") {
        await createGroup.mutateAsync({
          name: name.trim(),
          address: address.trim() || undefined,
          adminUserId: adminUserId.trim(),
        });
        addToast(t("createdToast"), "success");
        router.push("/admin/groups");
        return;
      }

      if (!groupId) {
        setError(t("updateError"));
        return;
      }

      await updateGroup.mutateAsync({
        groupId,
        name: name.trim(),
        address: address.trim() || undefined,
      });

      if (adminUserId.trim() !== initialAdminUserId) {
        await assignAdmin.mutateAsync({
          groupId,
          adminUserId: adminUserId.trim(),
        });
      }

      addToast(t("updatedToast"), "success");
      router.push(`/admin/groups/${groupId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("updateError");
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="group-form-root">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">
          {mode === "create" ? tPage("createTitle") : tPage("editTitle")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {mode === "create" ? tPage("createSubtitle") : tPage("editSubtitle")}
        </p>
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
              <SparklesIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Core details
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="group-name" className="block text-sm font-medium text-stone-700">
                  {t("fields.name")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="group-name"
                  className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("namePlaceholder")}
                  disabled={isDisabled}
                  data-testid="group-form-name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="group-address" className="block text-sm font-medium text-stone-700">
                  {t("fields.address")}
                </label>
                <div className="relative">
                  <MapPinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="group-address"
                    className={`${inputBase} border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={t("addressPlaceholder")}
                    disabled={isDisabled}
                    data-testid="group-form-address"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <ShieldIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Group owner
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="group-admin-user-id" className="block text-sm font-medium text-stone-700">
                  {t("fields.adminUserId")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="group-admin-user-id"
                  className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                  value={adminUserId}
                  onChange={(event) => setAdminUserId(event.target.value)}
                  placeholder={t("adminPlaceholder")}
                  disabled={isDisabled}
                  data-testid="group-form-admin"
                />
                <p className="text-xs text-stone-400">{t("adminHint")}</p>
              </div>
            </div>
          </section>

          <div className="hidden items-center justify-between pt-2 sm:flex">
            <button
              type="button"
              onClick={() => router.push(cancelHref)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
              disabled={isDisabled}
            >
              {t("cancel")}
            </button>
            <button
              className="vh-v3-focus rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={!isValid || isDisabled}
              data-testid="group-form-submit"
            >
              {mode === "create"
                ? createGroup.isPending
                  ? t("creating")
                  : t("createAction")
                : updateGroup.isPending || assignAdmin.isPending
                  ? t("saving")
                  : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Group preview
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                  <UsersIcon className="h-4 w-4 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${name.trim() ? "text-stone-900" : "italic text-stone-400"}`}
                  >
                    {name.trim() || t("preview.newGroup")}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">{address.trim() || t("preview.noAddress")}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("preview.status")}</span>
                  <StatusBadge variant="active" label={t("preview.active")} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("fields.adminUserId")}</span>
                  <span className="text-xs text-stone-600">
                    {adminUserId.trim() || t("preview.notAssigned")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-xs font-semibold text-stone-600">{t("tips.title")}</p>
            <ul className="space-y-1.5 text-xs text-stone-500">
              <li>{t("tips.name")}</li>
              <li>{t("tips.owner")}</li>
              <li>{t("tips.address")}</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          disabled={isDisabled}
          className="flex-1 rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-600 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isDisabled}
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          data-testid="group-form-submit-mobile"
        >
          {mode === "create"
            ? createGroup.isPending
              ? t("creating")
              : t("createAction")
            : updateGroup.isPending || assignAdmin.isPending
              ? t("saving")
              : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
