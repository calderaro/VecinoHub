import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NeighborhoodAccessRequests } from "@/components/access-requests/neighborhood-access-requests";
import { listNeighborhoodAccessRequests } from "@/services/group-access-requests";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminNeighborhoodRequestsPage({
  params,
}: {
  params:
    | { neighborhoodId: string }
    | Promise<{ neighborhoodId: string }>;
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

  const neighborhood = await getNeighborhoodById(serviceContext, {
    neighborhoodId: resolvedParams.neighborhoodId,
  }).catch(() => null);

  if (!neighborhood) {
    redirect("/admin");
  }

  const [requests, t] = await Promise.all([
    listNeighborhoodAccessRequests(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
    }),
    getTranslations("admin.accessRequests"),
  ]);

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6"
      data-testid="admin-requests-root"
    >
      <Link
        href={adminBasePath}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{neighborhood.name}</p>
        <h1 className="text-xl font-bold text-stone-900" data-testid="admin-requests-title">
          {t("title")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </header>

      <NeighborhoodAccessRequests
        pending={requests.pending}
        history={requests.history}
        timeZone={neighborhood.timeZone}
      />
    </div>
  );
}
