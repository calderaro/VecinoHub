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
          className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-200"
          type="button"
          onClick={() => unpublish.mutate({ postId })}
          disabled={unpublish.isLoading}
        >
          {unpublish.isLoading ? "Unpublishing..." : "Unpublish"}
        </button>
      ) : (
        <button
          className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Delete post
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              This will permanently remove the post from the feed.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
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
