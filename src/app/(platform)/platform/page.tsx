import Link from "next/link";
import { redirect } from "next/navigation";

import { NeighborhoodCreateForm } from "@/components/platform/neighborhood-create-form";
import { listNeighborhoodsPaged } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function PlatformPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const neighborhoods = await listNeighborhoodsPaged(
    { user: session.user },
    { limit: 100, offset: 0 }
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Platform Administration</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage neighborhoods and platform-level access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/platform/users"
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100"
            data-testid="platform-manage-users-link"
          >
            Manage users
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100"
          >
            Go to neighborhood admin
          </Link>
        </div>
      </header>

      <NeighborhoodCreateForm />

      <section
        className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
        data-testid="platform-neighborhoods-list"
      >
        <div className="border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
            Neighborhoods ({neighborhoods.total})
          </h2>
        </div>
        {neighborhoods.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-stone-400">
            No neighborhoods found.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {neighborhoods.items.map((neighborhood) => (
              <li
                key={neighborhood.id}
                className="px-5 py-3"
                data-testid={`platform-neighborhood-row-${neighborhood.id}`}
              >
                <Link
                  href={`/platform/${neighborhood.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg transition-colors hover:bg-stone-50"
                  data-testid={`platform-neighborhood-link-${neighborhood.id}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{neighborhood.name}</p>
                    <p className="text-xs text-stone-500">/{neighborhood.slug}</p>
                    <p className="text-xs text-stone-400">{neighborhood.timeZone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        neighborhood.status === "active"
                          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                          : "bg-stone-100 text-stone-600 ring-1 ring-stone-200"
                      }`}
                    >
                      {neighborhood.status}
                    </span>
                    <span className="text-xs font-medium text-stone-400">View details</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
