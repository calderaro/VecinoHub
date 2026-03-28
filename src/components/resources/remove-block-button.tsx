"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function RemoveBlockButton({
  blockId,
  testId,
}: {
  blockId: string;
  testId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("resourcesUi.actions");
  const { addToast } = useToast();
  const removeBlock = trpc.resources.removeBlock.useMutation({
    onSuccess: () => {
      addToast(t("blockRemoved"), "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  return (
    <button
      type="button"
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={() => removeBlock.mutate({ blockId })}
      disabled={removeBlock.isPending}
      data-testid={testId}
    >
      {removeBlock.isPending ? t("removing") : t("remove")}
    </button>
  );
}
