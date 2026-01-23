"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type PostFormProps = {
  mode: "create" | "edit";
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
};

export function PostForm({
  mode,
  postId,
  initialTitle = "",
  initialContent = "",
}: PostFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);

  const createPost = trpc.posts.create.useMutation();
  const updatePost = trpc.posts.update.useMutation();

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <form
      className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError("Title and content are required.");
          return;
        }
        try {
          if (mode === "create") {
            await createPost.mutateAsync({
              title,
              content,
              status,
            });
          } else {
            await updatePost.mutateAsync({
              postId: postId ?? "",
              title,
              content,
            });
          }
          addToast(
            mode === "create" ? "Post created." : "Post updated.",
            "success"
          );
          if (mode === "create") {
            router.push("/admin/posts");
          } else {
            router.refresh();
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unable to save post.";
          setError(message);
        }
      }}
    >
      <h2 className="text-lg font-semibold">
        {mode === "create" ? "Create post" : "Edit post"}
      </h2>
      <div className="mt-4 space-y-4">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Title</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        {mode === "create" ? (
          <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
            <span>Status</span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "draft" | "published")
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        ) : null}
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Content</span>
          <textarea
            className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createPost.isLoading || updatePost.isLoading}
      >
        {mode === "create"
          ? createPost.isLoading
            ? "Creating..."
            : "Create post"
          : updatePost.isLoading
            ? "Saving..."
            : "Save changes"}
      </button>
    </form>
  );
}
