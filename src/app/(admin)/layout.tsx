import { redirect } from "next/navigation";

import { AdminShellChrome } from "@/components/admin/admin-shell-chrome";
import { getSession } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const userInitial = (session.user.username?.[0] ?? "A").toUpperCase();

  return (
    <AdminShellChrome userInitial={userInitial}>{children}</AdminShellChrome>
  );
}
