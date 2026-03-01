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
        className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface)] px-3 py-2 text-xs text-stone-900 outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
        data-testid="group-selector"
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
