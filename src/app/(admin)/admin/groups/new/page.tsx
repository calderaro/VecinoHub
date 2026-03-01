import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { getSession } from "@/server/auth";

export default async function NewGroupPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/groups");
  }

  return <GroupForm mode="create" defaultAdminUserId={session.user.id} />;
}
