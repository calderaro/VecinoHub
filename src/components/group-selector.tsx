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
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
      Group
      <select
        className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none ring-slate-700 focus:ring-2"
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
