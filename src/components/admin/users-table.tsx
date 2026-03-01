"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";

import { SearchInput, StatusBadge } from "@/components/ui-v3";

type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function UsersTable({
  users,
  totalUsers,
  groupCounts,
  currentPage,
  totalPages,
  query,
  role,
  status,
}: {
  users: AdminUser[];
  totalUsers: number;
  groupCounts: Record<string, number>;
  currentPage: number;
  totalPages: number;
  query: string;
  role: string;
  status: string;
}) {
  const t = useTranslations("admin.usersTable");

  const startIndex = users.length > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const endIndex = users.length > 0 ? startIndex + users.length - 1 : 0;

  function formatDate(value: Date | string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <>
      <form
        className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
        method="get"
      >
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              testId="admin-users-search"
            />
          </div>
          <div className="relative">
            <select
              className="vh-v3-focus appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
              name="role"
              data-testid="admin-users-role"
              defaultValue={role}
            >
              <option value="">{t("roles.all")}</option>
              <option value="user">{t("roles.user")}</option>
              <option value="admin">{t("roles.admin")}</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
          <div className="relative">
            <select
              className="vh-v3-focus appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
              name="status"
              data-testid="admin-users-status"
              defaultValue={status}
            >
              <option value="">{t("statuses.all")}</option>
              <option value="active">{t("statuses.active")}</option>
              <option value="inactive">{t("statuses.inactive")}</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </form>

      <div
        className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
        data-testid="admin-users-table"
      >
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-stone-400">{t("empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                    Groups
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Joined
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((user) => {
                  const displayName = user.username ?? user.name;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-stone-50"
                      data-testid={`admin-users-row-${user.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="group flex items-center gap-3"
                          data-testid={`user-list-detail-${user.id}`}
                        >
                          {user.image ? (
                            <Image
                              className="h-8 w-8 rounded-full border border-stone-200 object-cover"
                              src={user.image}
                              alt={displayName}
                              width={32}
                              height={32}
                              sizes="32px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                              {(displayName?.[0] ?? "?").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-stone-900 transition-colors group-hover:text-teal-700">
                              {displayName}
                            </p>
                            <p className="text-xs text-stone-400">{user.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge variant={user.role} label={t(`roles.${user.role}`)} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge variant={user.status} label={t(`statuses.${user.status}`)} />
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-600 md:table-cell">
                        {groupCounts[user.id] ?? 0}
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-400 lg:table-cell">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-400 lg:table-cell">
                        {formatDate(user.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5 text-xs text-stone-400">
          <p>
            {startIndex}-{endIndex} of {totalUsers} users
          </p>
          <div className="flex items-center gap-2" data-testid="admin-users-pagination">
            {currentPage > 1 ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`/admin/users?${new URLSearchParams({
                  q: query || "",
                  role: role || "",
                  status: status || "",
                  page: String(currentPage - 1),
                }).toString()}`}
                data-testid="admin-users-prev"
              >
                Prev
              </Link>
            ) : null}
            <span className="px-1.5 text-xs font-medium text-stone-500">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`/admin/users?${new URLSearchParams({
                  q: query || "",
                  role: role || "",
                  status: status || "",
                  page: String(currentPage + 1),
                }).toString()}`}
                data-testid="admin-users-next"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
