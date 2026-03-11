import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { UserMenu } from "@/components/user-menu";
import { listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { getUserProfile } from "@/services/users";
import { getSession } from "@/server/auth";
import { normalizeLanguage } from "@/lib/locale";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }


  const serviceContext = { user: session.user };
  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };
  const [profile, groups, canAccessAdmin, adminNeighborhoods] = await Promise.all([
    getUserProfile({ user: session.user }),
    listUserGroups(unscopedContext),
    hasNeighborhoodAdminRole(serviceContext),
    listNeighborhoodAdminOptions(serviceContext),
  ]);
  const t = await getTranslations("profile");

  return (
    <div className="vh-v3 vh-v3-font min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="group flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-800 transition group-hover:text-teal-700">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-stone-400 transition group-hover:text-teal-600 group-hover:opacity-80">
              {t("navLabel")}
            </span>
          </Link>
          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
            neighborhoods={adminNeighborhoods}
            showAdminLink={canAccessAdmin}
            variant="dashboard-v2"
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="vh-v3-focus mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <ProfileForm
          name={profile.name}
          email={profile.email}
          initialUsername={profile.username}
          initialImage={profile.image}
          initialPreferredLanguage={normalizeLanguage(profile.preferredLanguage)}
        />
      </main>
    </div>
  );
}
