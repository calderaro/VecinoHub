"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function PostAdminActions({
  postId,
  status,
}: {
  postId: string;
  status: "draft" | "published";
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
      router.push("/admin/posts");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <>
      {status === "published" ? (
        <button
          className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="button"
          onClick={() => unpublish.mutate({ postId })}
          disabled={unpublish.isPending}
          data-testid="post-admin-unpublish"
        >
          {unpublish.isPending ? t("unpublishing") : t("unpublish")}
        </button>
      ) : (
        <button
          className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
          type="button"
          onClick={() => publish.mutate({ postId })}
          disabled={publish.isPending}
          data-testid="post-admin-publish"
        >
          {publish.isPending ? t("publishing") : t("publish")}
        </button>
      )}
      <button
        className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200"
        type="button"
        onClick={() => setConfirmOpen(true)}
        data-testid="post-admin-delete"
      >
        {t("delete")}
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("deleteTitle")}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("deleteBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                data-testid="post-admin-delete-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={remove.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
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
