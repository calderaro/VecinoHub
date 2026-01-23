import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <div className="relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-[color:var(--surface)] p-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(225,177,94,0.18),_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(102,185,165,0.2),_transparent_55%)]"
          />
          <div className="relative mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
