import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { getSession } from "@/server/auth";

export default async function NewPostPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return <PostForm mode="create" />;
}
