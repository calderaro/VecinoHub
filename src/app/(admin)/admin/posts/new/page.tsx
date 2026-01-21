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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Create post</h1>
        <p className="text-sm text-slate-400">
          Draft a neighborhood update for residents.
        </p>
      </header>
      <PostForm mode="create" />
    </div>
  );
}
