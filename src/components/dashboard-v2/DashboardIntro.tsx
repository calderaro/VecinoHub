import type { ReactNode } from "react";

type DashboardIntroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
};

export function DashboardIntro({ eyebrow, title, description }: DashboardIntroProps) {
  return (
    <header className="mb-8 space-y-2">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-widest text-teal-600">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-bold text-stone-900" data-testid="dashboard-overview-title">
        {title}
      </h1>
      {description ? <p className="max-w-xl text-sm text-stone-500">{description}</p> : null}
    </header>
  );
}
