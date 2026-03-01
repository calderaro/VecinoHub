import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  body: string;
};

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-600">{title}</p>
        <p className="mt-0.5 text-xs text-stone-400">{body}</p>
      </div>
    </div>
  );
}
