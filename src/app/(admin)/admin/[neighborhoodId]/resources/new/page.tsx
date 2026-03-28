import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ResourceForm } from "@/components/resources/resource-form";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminResourceCreatePage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const neighborhood = await getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null);
  const t = await getTranslations("admin.resources.createPage");
  if (!neighborhood) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <Link
        href={`/admin/${neighborhoodId}/resources`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{neighborhood.name}</p>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </div>

      <ResourceForm
        mode="create"
        neighborhoodId={neighborhoodId}
        adminBasePath={`/admin/${neighborhoodId}`}
        timeZone={neighborhood.timeZone}
      />
    </div>
  );
}
