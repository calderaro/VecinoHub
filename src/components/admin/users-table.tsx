"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
};

export function UsersTable({
  users,
  currentPage,
  totalPages,
  query,
  role,
  status,
}: {
  users: AdminUser[];
  currentPage: number;
  totalPages: number;
  query: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.usersTable");
  const [error, setError] = useState<string | null>(null);

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  const updateStatus = trpc.users.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  return (
    <div
      className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
      data-testid="admin-users-table"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <form className="flex flex-wrap gap-3" method="get">
          <input
            className="min-w-[200px] rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            name="q"
            data-testid="admin-users-search"
            placeholder={t("searchPlaceholder")}
            defaultValue={query}
          />
          <select
            className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            name="role"
            data-testid="admin-users-role"
            defaultValue={role}
          >
            <option value="">{t("roles.all")}</option>
            <option value="user">{t("roles.user")}</option>
            <option value="admin">{t("roles.admin")}</option>
          </select>
          <select
            className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            name="status"
            data-testid="admin-users-status"
            defaultValue={status}
          >
            <option value="">{t("statuses.all")}</option>
            <option value="active">{t("statuses.active")}</option>
            <option value="inactive">{t("statuses.inactive")}</option>
          </select>
          <button
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            type="submit"
            data-testid="admin-users-filter"
          >
            {t("filter")}
          </button>
        </form>
      </div>
      <div className="mt-4 space-y-3">
        {users.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
        ) : (
          users.map((user) => {
            const displayName = user.username ?? user.name;
            return (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-3 text-sm"
                data-testid={`admin-users-row-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <Image
                      className="h-10 w-10 rounded-full border border-[color:var(--stroke)] object-cover"
                      src={user.image}
                      alt={displayName}
                      width={40}
                      height={40}
                      sizes="40px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] text-xs font-semibold text-[color:var(--muted-strong)]">
                      {(displayName?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{displayName}</p>
                    {user.username ? (
                      <p className="text-xs text-[color:var(--muted)]">{user.name}</p>
                    ) : null}
                    <p className="text-xs text-[color:var(--muted)]">{user.email}</p>
                    <p className="text-xs text-[color:var(--muted)]">{user.id}</p>
                  </div>
                </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {t("roleLabel")}
                  <select
                    className="mt-2 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                    value={user.role}
                    data-testid={`admin-users-role-${user.id}`}
                    onChange={(event) =>
                      updateRole.mutate({
                        userId: user.id,
                        role: event.target.value as "user" | "admin",
                      })
                    }
                  >
                    <option value="user">{t("roles.userLower")}</option>
                    <option value="admin">{t("roles.adminLower")}</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {t("statusLabel")}
                  <select
                    className="mt-2 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                    value={user.status}
                    data-testid={`admin-users-status-${user.id}`}
                    onChange={(event) =>
                      updateStatus.mutate({
                        userId: user.id,
                        status: event.target.value as "active" | "inactive",
                      })
                    }
                  >
                    <option value="active">{t("statuses.activeLower")}</option>
                    <option value="inactive">{t("statuses.inactiveLower")}</option>
                  </select>
                </label>
              </div>
              </div>
            );
          })
        )}
      </div>
      {error ? (
        <p
          className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          data-testid="admin-users-error"
        >
          {error}
        </p>
      ) : null}

      <div
        className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]"
        data-testid="admin-users-pagination"
      >
        <span>{t("pagination.pageOf", { page: currentPage, total: totalPages })}</span>
        <div className="flex items-center gap-3">
          {currentPage > 1 ? (
            <a
              className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
              data-testid="admin-users-prev"
              href={`/admin?${new URLSearchParams({
                q: query || "",
                role: role || "",
                status: status || "",
                page: String(currentPage - 1),
              }).toString()}`}
            >
              {t("pagination.prev")}
            </a>
          ) : null}
          {currentPage < totalPages ? (
            <a
              className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
              data-testid="admin-users-next"
              href={`/admin?${new URLSearchParams({
                q: query || "",
                role: role || "",
                status: status || "",
                page: String(currentPage + 1),
              }).toString()}`}
            >
              {t("pagination.next")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
