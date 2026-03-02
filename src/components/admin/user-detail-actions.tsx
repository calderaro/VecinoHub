"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type UserDetailActionsProps = {
  userId: string;
  role: "user" | "admin" | "platform_admin";
  status: "active" | "inactive";
};

export function UserDetailActions({ userId, role, status }: UserDetailActionsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.userActions");

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      addToast(t("roleUpdated"), "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const updateStatus = trpc.users.updateStatus.useMutation({
    onSuccess: () => {
      addToast(t("statusUpdated"), "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const nextRole = role === "user" ? "platform_admin" : "user";
  const nextStatus = status === "active" ? "inactive" : "active";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <button
        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => updateRole.mutate({ userId, role: nextRole })}
        disabled={updateRole.isPending || updateStatus.isPending}
        data-testid="user-detail-toggle-role"
      >
        {updateRole.isPending
          ? t("saving")
          : nextRole === "platform_admin"
            ? t("makeAdmin")
            : t("makeUser")}
      </button>
      <button
        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => updateStatus.mutate({ userId, status: nextStatus })}
        disabled={updateRole.isPending || updateStatus.isPending}
        data-testid="user-detail-toggle-status"
      >
        {updateStatus.isPending
          ? t("saving")
          : nextStatus === "inactive"
            ? t("deactivate")
            : t("activate")}
      </button>
    </div>
  );
}
