import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PlatformUserProfileForm } from "@/components/platform/user-profile-form";
import { getPlatformUserById } from "@/services/users";
import { getSession } from "@/server/auth";

export default async function PlatformUserEditPage({
  params,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "platform_admin") {
    redirect("/");
  }

  const resolvedParams = await Promise.resolve(params);
  const user = await getPlatformUserById(
    {
      user: {
        ...session.user,
        activeNeighborhoodId: null,
      },
    },
    { userId: resolvedParams.userId }
  );
  const t = await getTranslations("platform.userEdit");
  const preferredLanguage = user.preferredLanguage === "en" ? "en" : "es";

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-6"
      data-testid="platform-user-edit-root"
    >
      <Link
        href={`/platform/users/${user.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        data-testid="platform-user-edit-back"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("back")}
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{t("pageTitle")}</h1>
        <p className="mt-2 text-sm text-stone-500">{t("pageSubtitle")}</p>
      </header>

      <PlatformUserProfileForm
        userId={user.id}
        name={user.name}
        email={user.email}
        initialUsername={user.username}
        initialImage={user.image}
        initialPreferredLanguage={preferredLanguage}
      />
    </div>
  );
}
