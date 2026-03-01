import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vh-v3 vh-v3-font min-h-screen bg-stone-50 text-stone-900" data-testid="auth-shell">
      {children}
    </div>
  );
}
