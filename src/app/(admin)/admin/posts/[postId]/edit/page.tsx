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
    <PostForm
      mode="edit"
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialStatus={post.status}
    />
  );
}
