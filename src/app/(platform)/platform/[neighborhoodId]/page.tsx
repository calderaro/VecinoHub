import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { formatPortDate } from "@/lib/port-time";
import { NeighborhoodDetailActions } from "@/components/platform/neighborhood-detail-actions";
import { NeighborhoodMembersManager } from "@/components/platform/neighborhood-members-manager";
import { StatusBadge } from "@/components/ui-v3";
import {
  getNeighborhoodById,
  listNeighborhoodMembersPaged,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function PlatformNeighborhoodDetailPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };

  const [neighborhood, members, adminMembers] = await Promise.all([
    getNeighborhoodById(serviceContext, { neighborhoodId: resolvedParams.neighborhoodId }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      limit: 100,
      offset: 0,
    }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
      role: "neighborhood_admin",
      limit: 1,
      offset: 0,
    }),
  ]);

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6"
      data-testid="platform-neighborhood-detail-root"
    >
      <Link
        href="/platform"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        data-testid="platform-neighborhood-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back to neighborhoods
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                Neighborhood
              </p>
              <h1 className="text-xl font-bold text-stone-900">{neighborhood.name}</h1>
              <p className="mt-1 text-sm text-stone-500">/{neighborhood.slug}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <StatusBadge
                  variant={neighborhood.status}
                  label={neighborhood.status === "active" ? "Active" : "Inactive"}
                />
                <span className="text-xs text-stone-400">
                  Created {formatPortDate(neighborhood.createdAt, neighborhood.timeZone, "en")}
                </span>
                <span className="text-xs text-stone-400">
                  Updated {formatPortDate(neighborhood.updatedAt, neighborhood.timeZone, "en")}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/platform/${neighborhood.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                data-testid="platform-neighborhood-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> Edit neighborhood
              </Link>
              <NeighborhoodDetailActions
                neighborhoodId={neighborhood.id}
                neighborhoodName={neighborhood.name}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Members</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{members.total}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Neighborhood admins</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{adminMembers.total}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Created by</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {neighborhood.creatorName ?? neighborhood.creatorEmail ?? "Unknown"}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Time zone</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{neighborhood.timeZone}</p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-stone-400">Neighborhood id</p>
            <p className="mt-1 break-all text-sm font-medium text-stone-900">{neighborhood.id}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Creator email</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {neighborhood.creatorEmail ?? "Unknown"}
            </p>
          </div>
        </div>

        <div className="px-6 py-5" data-testid="platform-neighborhood-members">
          <NeighborhoodMembersManager
            neighborhoodId={neighborhood.id}
            initialMembers={members.items}
          />
          {members.total > members.items.length ? (
            <p className="mt-3 text-xs text-stone-400">
              Showing the first {members.items.length} users.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
