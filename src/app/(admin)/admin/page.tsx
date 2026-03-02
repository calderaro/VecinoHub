import Link from "next/link";
import { redirect } from "next/navigation";

import { listNeighborhoodsPaged } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminNeighborhoodSelectorPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const neighborhoods = await listNeighborhoodsPaged({ user: session.user }, { limit: 100, offset: 0 });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6" data-testid="admin-neighborhood-selector-root">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Select a neighborhood</h1>
        <p className="mt-2 text-sm text-stone-500">Choose the neighborhood you want to manage.</p>
      </header>

      {neighborhoods.items.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm" data-testid="admin-neighborhood-empty-state">
          <h2 className="text-lg font-semibold text-stone-900">No neighborhoods available</h2>
          <p className="mt-2 text-sm text-stone-500">You do not have access to any active neighborhood yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="admin-neighborhood-list">
          {neighborhoods.items.map((neighborhood) => (
            <Link
              key={neighborhood.id}
              href={`/admin/${neighborhood.id}`}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/40"
              data-testid={`admin-neighborhood-card-${neighborhood.id}`}
            >
              <p className="text-base font-semibold text-stone-900">{neighborhood.name}</p>
              <p className="mt-1 text-xs text-stone-500">/{neighborhood.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
