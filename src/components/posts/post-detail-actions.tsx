"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function PostDetailActions({
  postId,
  status,
  adminBasePath = "/admin",
}: {
  postId: string;
  status: "draft" | "published";
  adminBasePath?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.postActions");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const publish = trpc.posts.publish.useMutation({
    onSuccess: () => {
      addToast(t("publishedToast"), "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const unpublish = trpc.posts.unpublish.useMutation({
    onSuccess: () => {
      addToast(t("unpublishedToast"), "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const remove = trpc.posts.remove.useMutation({
    onSuccess: () => {
      addToast(t("deletedToast"), "success");
      router.push(`${adminBasePath}/posts`);
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <>
      {status === "published" ? (
        <button
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => unpublish.mutate({ postId })}
          disabled={unpublish.isPending}
          data-testid="post-admin-unpublish"
        >
          {unpublish.isPending ? t("unpublishing") : t("unpublish")}
        </button>
      ) : (
        <button
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => publish.mutate({ postId })}
          disabled={publish.isPending}
          data-testid="post-admin-publish"
        >
          {publish.isPending ? t("publishing") : t("publish")}
        </button>
      )}
      <button
        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => setConfirmOpen(true)}
        data-testid="post-admin-delete"
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
                data-testid="post-admin-delete-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={remove.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm text-red-700 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="post-admin-delete-confirm"
                onClick={() => remove.mutate({ postId })}
                disabled={remove.isPending}
              >
                {remove.isPending ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
