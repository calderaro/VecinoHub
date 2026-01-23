"use client";

import { useRouter } from "next/navigation";

export type GroupOption = {
  id: string;
  name: string;
};

export function GroupSelector({
  groups,
  selectedGroupId,
  basePath,
}: {
  groups: GroupOption[];
  selectedGroupId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
      Group
      <select
        className="rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
        value={selectedGroupId}
        onChange={(event) => {
          router.push(`${basePath}/${event.target.value}`);
        }}
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
    </label>
  );
}
