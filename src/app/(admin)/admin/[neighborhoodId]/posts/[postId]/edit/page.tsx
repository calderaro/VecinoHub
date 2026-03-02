import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

export default async function AdminPostEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; postId: string }
    | Promise<{ neighborhoodId: string; postId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };
  const post = await getPostById(serviceContext, { postId: resolvedParams.postId });

  return (
    <PostForm
      mode="edit"
      adminBasePath={adminBasePath}
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialStatus={post.status}
    />
  );
}
