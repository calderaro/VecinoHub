"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircleIcon,
  CalendarIcon,
  FileTextIcon,
  ImageIcon,
  ZapIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type PublishSetting = "immediate" | "draft" | "scheduled";

type PostFormProps = {
  mode: "create" | "edit";
  adminBasePath?: string;
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialStatus?: "draft" | "published";
};

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-400";

export function PostForm({
  mode,
  adminBasePath = "/admin",
  postId,
  initialTitle = "",
  initialContent = "",
  initialStatus = "draft",
}: PostFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const tPage = useTranslations("admin.postFormPage");
  const t = useTranslations("admin.postForm");
  const tStatus = useTranslations("status");

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [publishSetting, setPublishSetting] = useState<PublishSetting>(
    initialStatus === "published" ? "immediate" : "draft"
  );
  const [error, setError] = useState<string | null>(null);

  const createPost = trpc.posts.create.useMutation();
  const updatePost = trpc.posts.update.useMutation();
  const publishPost = trpc.posts.publish.useMutation();
  const unpublishPost = trpc.posts.unpublish.useMutation();

  const resolvedStatus = useMemo<"draft" | "published">(() => {
    return publishSetting === "immediate" ? "published" : "draft";
  }, [publishSetting]);

  const isDisabled =
    createPost.isPending ||
    updatePost.isPending ||
    publishPost.isPending ||
    unpublishPost.isPending;

  async function handleSubmit() {
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError(t("validationError"));
      return;
    }

    if (publishSetting === "scheduled") {
      setError("Scheduling is not available in this version.");
      return;
    }

    try {
      if (mode === "create") {
        await createPost.mutateAsync({
          title,
          content,
          status: resolvedStatus,
        });
        addToast(t("createdToast"), "success");
        router.push(`${adminBasePath}/posts`);
        return;
      }

      if (!postId) {
        setError("Missing post id.");
        return;
      }

      await updatePost.mutateAsync({
        postId,
        title,
        content,
      });

      if (initialStatus !== resolvedStatus) {
        if (resolvedStatus === "published") {
          await publishPost.mutateAsync({ postId });
        } else {
          await unpublishPost.mutateAsync({ postId });
        }
      }

      addToast(t("updatedToast"), "success");
      router.push(`${adminBasePath}/posts/${postId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveError");
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="post-form-root">
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
            <p className="text-sm font-semibold text-red-700">Failed to save post</p>
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
              <ZapIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Core details
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="post-title" className="block text-sm font-medium text-stone-700">
                  {t("fields.title")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="post-title"
                  className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                  placeholder="e.g. Community update for this weekend"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isDisabled}
                  data-testid="post-form-title"
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <FileTextIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Content
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="post-content" className="block text-sm font-medium text-stone-700">
                  {t("fields.content")} <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="post-content"
                  className={`${inputBase} min-h-[220px] resize-none border-stone-200 bg-white hover:border-stone-300`}
                  placeholder="Write your post content here..."
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  disabled={isDisabled}
                  data-testid="post-form-content"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-stone-700">Media attachments</label>
                <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-200 px-5 py-6 text-center opacity-70">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
                    <ImageIcon className="h-4.5 w-4.5 text-stone-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-600">Upload coming soon</p>
                    <p className="mt-0.5 text-xs text-stone-400">PNG, JPG, PDF up to 10 MB</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <CalendarIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Publish settings
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <fieldset className="space-y-2" disabled={isDisabled}>
                <legend className="mb-2 text-sm font-medium text-stone-700">When to publish</legend>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${publishSetting === "immediate" ? "border-teal-400 bg-teal-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}
                >
                  <input
                    className="mt-0.5 accent-teal-600"
                    type="radio"
                    name="publish-setting"
                    checked={publishSetting === "immediate"}
                    onChange={() => setPublishSetting("immediate")}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-800">Publish immediately</p>
                    <p className="mt-0.5 text-xs text-stone-500">Visible to residents right away.</p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${publishSetting === "draft" ? "border-teal-400 bg-teal-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}
                >
                  <input
                    className="mt-0.5 accent-teal-600"
                    type="radio"
                    name="publish-setting"
                    checked={publishSetting === "draft"}
                    onChange={() => setPublishSetting("draft")}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-800">Save as draft</p>
                    <p className="mt-0.5 text-xs text-stone-500">Not visible to residents yet.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 opacity-70">
                  <input
                    className="mt-0.5 accent-teal-600"
                    type="radio"
                    name="publish-setting"
                    checked={publishSetting === "scheduled"}
                    onChange={() => setPublishSetting("scheduled")}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-800">Schedule for later</p>
                    <p className="mt-0.5 text-xs text-stone-500">Coming soon in a future release.</p>
                  </div>
                </label>
              </fieldset>
              <input type="hidden" value={resolvedStatus} data-testid="post-form-status" />
            </div>
          </section>

          <div className="hidden items-center justify-between pt-2 sm:flex">
            <button
              type="button"
              onClick={() =>
                router.push(
                  mode === "create"
                    ? `${adminBasePath}/posts`
                    : `${adminBasePath}/posts/${postId}`
                )
              }
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
              disabled={isDisabled}
            >
              Cancel
            </button>
            <button
              className="vh-v3-focus rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isDisabled}
              data-testid="post-form-submit"
            >
              {isDisabled
                ? mode === "create"
                  ? t("creating")
                  : t("saving")
                : mode === "create"
                  ? t("createAction")
                  : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Post preview
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                  <FileTextIcon className="h-4 w-4 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${title.trim() ? "text-stone-900" : "italic text-stone-400"}`}
                  >
                    {title.trim() || "New Post"}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">Community</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">Status</span>
                  <StatusBadge variant={resolvedStatus} label={tStatus(resolvedStatus)} />
                </div>
                {content.trim() ? (
                  <p className="line-clamp-3 border-t border-stone-100 pt-2 text-xs leading-relaxed text-stone-500">
                    {content}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-xs font-semibold text-stone-600">Tips</p>
            <ul className="space-y-1.5 text-xs text-stone-500">
              <li>Keep titles concise and specific.</li>
              <li>Use draft mode to review before publish.</li>
              <li>Use clear calls to action for residents.</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() =>
            router.push(
              mode === "create"
                ? `${adminBasePath}/posts`
                : `${adminBasePath}/posts/${postId}`
            )
          }
          className="flex-1 rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-600"
          disabled={isDisabled}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          data-testid="post-form-submit-mobile"
        >
          {isDisabled
            ? mode === "create"
              ? t("creating")
              : t("saving")
            : mode === "create"
              ? t("createAction")
              : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
