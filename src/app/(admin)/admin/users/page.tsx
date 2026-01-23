import { redirect } from "next/navigation";

import { UsersTable } from "@/components/admin/users-table";
import { listUsersPaged } from "@/services/users";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const role =
    typeof resolvedSearchParams.role === "string"
      ? resolvedSearchParams.role
      : "";
  const status =
    typeof resolvedSearchParams.status === "string"
      ? resolvedSearchParams.status
      : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const usersPaged = await listUsersPaged({ user: session.user }, {
    query: query || undefined,
    role: role ? (role as "user" | "admin") : undefined,
    status: status ? (status as "active" | "inactive") : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(usersPaged.total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Administration</p>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Manage roles and access status.
        </p>
      </header>

      <UsersTable
        users={usersPaged.items}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        role={role}
        status={status}
      />
    </div>
  );
}
