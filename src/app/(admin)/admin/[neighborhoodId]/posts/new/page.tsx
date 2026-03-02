import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { getSession } from "@/server/auth";

export default async function NewPostPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  return <PostForm mode="create" adminBasePath={adminBasePath} />;
}
