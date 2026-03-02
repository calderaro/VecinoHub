import { redirect } from "next/navigation";

import { UserForm } from "@/components/admin/user-form";
import { getUserById } from "@/services/users";
import { getSession } from "@/server/auth";

export default async function AdminUserEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; userId: string }
    | Promise<{ neighborhoodId: string; userId: string }>;
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

  if (session.user.role !== "admin" && session.user.role !== "platform_admin") {
    redirect(adminBasePath);
  }

  const user = await getUserById(serviceContext, { userId: resolvedParams.userId });

  return (
    <UserForm
      adminBasePath={adminBasePath}
      userId={user.id}
      name={user.name}
      email={user.email}
      username={user.username}
      role={user.role}
      status={user.status}
    />
  );
}
