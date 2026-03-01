"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function GroupDetailActions({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.groupActions");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeGroup = trpc.groups.remove.useMutation({
    onSuccess: () => {
      addToast(t("deletedToast"), "success");
      router.push("/admin/groups");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <>
      <button
        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => setConfirmOpen(true)}
        data-testid="group-admin-delete"
      >
        {t("delete")}
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">{t("deleteTitle")}</h3>
            <p className="mt-1 text-sm text-stone-500">{t("deleteBody")}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                data-testid="group-admin-delete-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={removeGroup.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm text-red-700 transition hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="group-admin-delete-confirm"
                onClick={() => removeGroup.mutate({ groupId })}
                disabled={removeGroup.isPending}
              >
                {removeGroup.isPending ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
