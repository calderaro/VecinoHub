import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { UsersTable } from "@/components/admin/users-table";
import { getUserGroupCounts, listUsersPaged } from "@/services/users";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

export default async function PlatformUsersPage({
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

  if (session.user.role !== "admin" && session.user.role !== "platform_admin") {
    redirect("/");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q.trim() : "";
  const role =
    typeof resolvedSearchParams.role === "string" ? resolvedSearchParams.role : "";
  const status =
    typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const usersPaged = await listUsersPaged(serviceContext, {
    query: query || undefined,
    role: role ? (role as "user" | "admin" | "platform_admin") : undefined,
    status: status ? (status as "active" | "inactive") : undefined,
    limit: PAGE_SIZE,
    offset,
  });
  const groupCounts = await getUserGroupCounts(serviceContext, {
    userIds: usersPaged.items.map((user) => user.id),
  });
  const totalPages = Math.max(1, Math.ceil(usersPaged.total / PAGE_SIZE));
  const t = await getTranslations("platform.users");

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6"
      data-testid="platform-users-root"
    >
      <div className="flex items-center gap-3">
        <Link
          href="/platform"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
          data-testid="platform-users-back"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t("back")}
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" data-testid="platform-users-title">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
          <p className="mt-1 text-sm text-stone-500">{t("totalUsers", { count: usersPaged.total })}</p>
        </div>
      </header>

      <UsersTable
        users={usersPaged.items}
        totalUsers={usersPaged.total}
        groupCounts={Object.fromEntries(groupCounts)}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        role={role}
        status={status}
        showRoleFilter
        showRoleColumn
        adminBasePath="/platform"
      />
    </div>
  );
}
