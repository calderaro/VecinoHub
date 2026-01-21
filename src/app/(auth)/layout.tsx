import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-black/30">
          {children}
        </div>
      </div>
    </div>
  );
}
