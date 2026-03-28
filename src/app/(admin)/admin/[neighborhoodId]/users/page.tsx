import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { UsersTable } from "@/components/admin/users-table";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { listNeighborhoodGroupUsersPaged } from "@/services/users";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
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

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
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

  const [usersPaged, neighborhood] = await Promise.all([
    listNeighborhoodGroupUsersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      query: query || undefined,
      status: status ? (status as "active" | "inactive") : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getNeighborhoodById(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(usersPaged.total / PAGE_SIZE));
  const t = await getTranslations("admin.users");

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6"
      data-testid="admin-users-root"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900" data-testid="admin-users-title">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
          <p className="mt-1 text-sm text-stone-500">
            {t("totalGroupUsers", { count: usersPaged.total })}
          </p>
        </div>
        <Link
          href={`${adminBasePath}/members`}
          className="vh-v3-focus rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
        >
          {t("manageNeighborhoodMembers")}
        </Link>
      </header>

      <UsersTable
        users={usersPaged.items}
        totalUsers={usersPaged.total}
        groupCounts={Object.fromEntries(usersPaged.items.map((user) => [user.id, user.groupCount]))}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        status={status}
        adminBasePath={adminBasePath}
        timeZone={neighborhood.timeZone}
      />
    </div>
  );
}
