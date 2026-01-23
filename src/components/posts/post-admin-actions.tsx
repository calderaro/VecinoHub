"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const publish = trpc.posts.publish.useMutation({
    onSuccess: () => {
      addToast("Post published.", "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const unpublish = trpc.posts.unpublish.useMutation({
    onSuccess: () => {
      addToast("Post unpublished.", "success");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const remove = trpc.posts.remove.useMutation({
    onSuccess: () => {
      addToast("Post deleted.", "success");
      router.push("/admin/posts");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <>
      {status === "published" ? (
        <button
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="button"
          onClick={() => unpublish.mutate({ postId })}
          disabled={unpublish.isLoading}
        >
          {unpublish.isLoading ? "Unpublishing..." : "Unpublish"}
        </button>
      ) : (
        <button
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)]"
          type="button"
          onClick={() => publish.mutate({ postId })}
          disabled={publish.isLoading}
        >
          {publish.isLoading ? "Publishing..." : "Publish"}
        </button>
      )}
      <button
        className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200"
        type="button"
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Delete post
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              This will permanently remove the post from the feed.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={remove.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => remove.mutate({ postId })}
                disabled={remove.isLoading}
              >
                {remove.isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
