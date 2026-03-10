import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { NeighborhoodForm } from "@/components/platform/neighborhood-form";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function PlatformNeighborhoodEditPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const neighborhood = await getNeighborhoodById(
    { user: session.user },
    { neighborhoodId: resolvedParams.neighborhoodId }
  );

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-6"
      data-testid="platform-neighborhood-edit-root"
    >
      <Link
        href={`/platform/${neighborhood.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        data-testid="platform-neighborhood-edit-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back to details
      </Link>

      <NeighborhoodForm
        mode="edit"
        neighborhoodId={neighborhood.id}
        initialName={neighborhood.name}
        initialSlug={neighborhood.slug}
        initialStatus={neighborhood.status}
      />
    </div>
  );
}
