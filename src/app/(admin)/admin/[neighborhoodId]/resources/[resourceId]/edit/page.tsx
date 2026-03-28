import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ResourceForm } from "@/components/resources/resource-form";
import { getResourceAdminDetail } from "@/services/resources";
import { getSession } from "@/server/auth";

export default async function AdminResourceEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; resourceId: string }
    | Promise<{ neighborhoodId: string; resourceId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, resourceId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [t, resource] = await Promise.all([
    getTranslations("admin.resources.editPage"),
    getResourceAdminDetail(serviceContext, { resourceId }).catch(() => null),
  ]);
  if (!resource) {
    redirect(`/admin/${neighborhoodId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <Link
        href={`/admin/${neighborhoodId}/resources/${resourceId}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{resource.neighborhoodName}</p>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </div>

      <ResourceForm
        mode="edit"
        neighborhoodId={neighborhoodId}
        adminBasePath={`/admin/${neighborhoodId}`}
        resourceId={resourceId}
        timeZone={resource.timeZone}
        initialResource={{
          name: resource.name,
          description: resource.description,
          type: resource.type,
          location: resource.location,
          capacity: resource.capacity,
          status: resource.status,
          requiresDeposit: resource.requiresDeposit,
          depositAmount: resource.depositAmount,
          reservationFeeAmount: resource.reservationFeeAmount,
          usageRules: resource.usageRules,
          termsText: resource.termsText,
        }}
        initialAvailabilityWindows={resource.availabilityWindows}
        initialRules={resource.rules}
      />
    </div>
  );
}
