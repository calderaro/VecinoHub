import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { UserMenu } from "@/components/user-menu";
import { listUserGroups } from "@/services/groups";
import { getUserProfile } from "@/services/users";
import { getSession } from "@/server/auth";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [profile, groups] = await Promise.all([
    getUserProfile({ user: session.user }),
    listUserGroups({ user: session.user }),
  ]);

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <header className="border-b border-white/10 bg-[rgba(10,16,16,0.78)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/dashboard" className="group flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition group-hover:text-[color:var(--accent)]">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)] group-hover:opacity-80">
              Profile
            </span>
          </Link>
          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <ProfileForm
          name={profile.name}
          email={profile.email}
          initialUsername={profile.username}
          initialImage={profile.image}
        />
      </main>
    </div>
  );
}
