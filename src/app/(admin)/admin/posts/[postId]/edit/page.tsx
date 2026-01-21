import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

export default async function AdminPostEditPage({
  params,
}: {
  params: { postId: string } | Promise<{ postId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const post = await getPostById({ user: session.user }, resolvedParams);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Edit post</h1>
        <p className="text-sm text-slate-400">
          Update the content before publishing.
        </p>
      </header>
      <PostForm
        mode="edit"
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
      />
    </div>
  );
}
