import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--foreground)]" data-testid="auth-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
        <div
          className="relative w-full overflow-hidden rounded-[32px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-10"
          data-testid="auth-shell-card"
        >
          <div className="relative mx-auto w-full max-w-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
