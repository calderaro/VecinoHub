import { ClockIcon, HomeIcon } from "lucide-react";

type NoGroupStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  statusLabel: string;
  helpText: string;
};

export function NoGroupState({ eyebrow, title, body, statusLabel, helpText }: NoGroupStateProps) {
  return (
    <main
      className="flex min-h-screen w-full items-center justify-center bg-stone-50 px-4"
      data-testid="dashboard-no-group-state"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
          <HomeIcon className="h-8 w-8 text-teal-600" aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-teal-600">{eyebrow}</p>

        <h1 className="mb-3 text-2xl font-bold text-stone-900">{title}</h1>

        <p className="mb-8 text-sm leading-relaxed text-stone-500">{body}</p>

        <div
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2"
          data-testid="dashboard-no-group-status"
        >
          <ClockIcon className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <span className="text-sm font-medium text-amber-700">{statusLabel}</span>
        </div>

        <p className="mt-6 text-xs text-stone-400">{helpText}</p>
      </div>
    </main>
  );
}
