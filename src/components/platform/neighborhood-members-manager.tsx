"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, PlusIcon, UsersIcon } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type NeighborhoodMember = {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  systemRole: "user" | "admin" | "platform_admin";
  membershipRole: "neighbor" | "neighborhood_admin";
  membershipStatus: "active" | "inactive";
  createdAt: Date | string;
};

export function NeighborhoodMembersManager({
  neighborhoodId,
  initialMembers,
}: {
  neighborhoodId: string;
  initialMembers: NeighborhoodMember[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"neighbor" | "neighborhood_admin">("neighbor");

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        if (left.membershipRole !== right.membershipRole) {
          return left.membershipRole === "neighborhood_admin" ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }),
    [members]
  );

  const addMember = trpc.neighborhoods.addMemberByEmail.useMutation({
    onSuccess: (member) => {
      setMembers((current) => {
        const next = current.filter((item) => item.userId !== member.userId);
        return [member, ...next];
      });
      setEmail("");
      setRole("neighbor");
      addToast("Neighborhood member saved.", "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const updateRole = trpc.neighborhoods.setMemberRole.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) =>
        current.map((member) =>
          member.userId === variables.userId
            ? {
                ...member,
                membershipRole: variables.role,
                membershipStatus: "active",
              }
            : member
        )
      );
      addToast("Neighborhood role updated.", "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const updateStatus = trpc.neighborhoods.updateMembershipStatus.useMutation({
    onSuccess: (_, variables) => {
      setMembers((current) =>
        current.map((member) =>
          member.userId === variables.userId
            ? {
                ...member,
                membershipStatus: variables.status,
              }
            : member
        )
      );
      addToast("Neighborhood membership updated.", "success");
      router.refresh();
    },
    onError: (error) => addToast(error.message, "error"),
  });

  const isMutating =
    addMember.isPending || updateRole.isPending || updateStatus.isPending;

  function getSystemRoleLabel(value: "user" | "admin" | "platform_admin") {
    if (value === "platform_admin") return "Platform admin";
    if (value === "admin") return "Admin";
    return "User";
  }

  return (
    <div className="space-y-4" data-testid="platform-neighborhood-members-manager">
      <div className="flex items-center gap-2 text-stone-500">
        <UsersIcon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Users</p>
      </div>

      <form
        className="rounded-xl border border-stone-200 bg-stone-50 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          addMember.mutate({
            neighborhoodId,
            email: email.trim(),
            role,
          });
        }}
        data-testid="platform-neighborhood-add-member-form"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-xs font-medium text-stone-500">User email</span>
            <input
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-teal-400"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
              data-testid="platform-neighborhood-add-member-email"
            />
          </label>
          <label className="w-full sm:w-56">
            <span className="mb-1 block text-xs font-medium text-stone-500">Role</span>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm text-stone-900 outline-none transition-colors focus:border-teal-400"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "neighbor" | "neighborhood_admin")
                }
                data-testid="platform-neighborhood-add-member-role"
              >
                <option value="neighbor">Neighbor</option>
                <option value="neighborhood_admin">Neighborhood admin</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </div>
          </label>
          <button
            type="submit"
            disabled={addMember.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="platform-neighborhood-add-member-submit"
          >
            <PlusIcon className="h-4 w-4" />
            {addMember.isPending ? "Saving..." : "Add user"}
          </button>
        </div>
      </form>

      {sortedMembers.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
          data-testid="platform-neighborhood-members-empty"
        >
          No users belong to this neighborhood yet.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-3"
              data-testid={`platform-neighborhood-member-${member.userId}`}
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/${neighborhoodId}/users/${member.userId}`}
                  className="truncate text-sm font-medium text-stone-900 transition-colors hover:text-teal-700"
                >
                  {member.name}
                </Link>
                <p className="truncate text-xs text-stone-400">
                  {member.email}
                  {member.username ? ` · @${member.username}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  variant={
                    member.systemRole === "platform_admin"
                      ? "platform_admin"
                      : member.systemRole === "admin"
                        ? "admin"
                        : "user"
                  }
                  label={getSystemRoleLabel(member.systemRole)}
                />

                <div className="relative">
                  <select
                    className="appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 outline-none transition-colors focus:border-teal-400"
                    value={member.membershipRole}
                    onChange={(event) =>
                      updateRole.mutate({
                        neighborhoodId,
                        userId: member.userId,
                        role: event.target.value as "neighbor" | "neighborhood_admin",
                      })
                    }
                    disabled={isMutating}
                    data-testid={`platform-neighborhood-member-role-${member.userId}`}
                  >
                    <option value="neighbor">Neighbor</option>
                    <option value="neighborhood_admin">Neighborhood admin</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
                </div>

                <div className="relative">
                  <select
                    className="appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 outline-none transition-colors focus:border-teal-400"
                    value={member.membershipStatus}
                    onChange={(event) =>
                      updateStatus.mutate({
                        neighborhoodId,
                        userId: member.userId,
                        status: event.target.value as "active" | "inactive",
                      })
                    }
                    disabled={isMutating}
                    data-testid={`platform-neighborhood-member-status-${member.userId}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
                </div>

                <StatusBadge
                  variant={member.membershipStatus}
                  label={member.membershipStatus === "active" ? "Active" : "Inactive"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
