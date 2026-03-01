import { redirect } from "next/navigation";

import { UserForm } from "@/components/admin/user-form";
import { getUserById } from "@/services/users";
import { getSession } from "@/server/auth";

export default async function AdminUserEditPage({
  params,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin");
  }

  const resolvedParams = await Promise.resolve(params);
  const user = await getUserById({ user: session.user }, resolvedParams);

  return (
    <UserForm
      userId={user.id}
      name={user.name}
      email={user.email}
      username={user.username}
      role={user.role}
      status={user.status}
    />
  );
}
