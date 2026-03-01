import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/server/auth";

const capabilities = [
  {
    title: "Resident communication",
    description:
      "Keep announcements, updates, and notices in one place with clear visibility per group.",
  },
  {
    title: "Events and participation",
    description:
      "Coordinate meetings, activities, and reminders with schedules residents can actually follow.",
  },
  {
    title: "Polls and decisions",
    description:
      "Collect transparent votes per group and keep decisions auditable for your community.",
  },
  {
    title: "Fundraising controls",
    description:
      "Track campaigns, contributions, and statuses with practical tools for administrators.",
  },
];

const trustLinks = [
  { label: "Terms of Service", href: "/en/terms-of-service", testId: "landing-legal-terms" },
  { label: "Privacy Policy", href: "/en/privacy-policy", testId: "landing-legal-privacy" },
  { label: "Data Deletion Guide", href: "/en/data-deletion", testId: "landing-legal-deletion" },
];

export const metadata: Metadata = {
  title: "VecinoHub | Neighborhood Operations",
  description:
    "VecinoHub centralizes communication, events, polls, and fundraising for modern residential communities.",
};

export default async function RootPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100" data-testid="landing-root">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-teal-500/30 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 sm:py-10">
        <header
          className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur sm:px-6"
          data-testid="landing-header"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 text-sm font-semibold text-teal-200">
              VH
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200/80">VecinoHub</p>
              <p className="text-xs text-stone-300">Neighborhood management platform</p>
            </div>
          </div>
          <Link
            href="/login"
            className="vh-v3-focus rounded-xl border border-teal-300/60 bg-teal-300/90 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-teal-200"
            data-testid="landing-login-link"
          >
            Open app
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-12 sm:py-16" data-testid="landing-main">
          <section className="grid items-start gap-10 lg:grid-cols-[1.2fr_0.8fr]" data-testid="landing-hero">
            <div className="space-y-7">
              <p className="inline-flex rounded-full border border-teal-200/30 bg-teal-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
                Fresh, modern, and operational
              </p>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Professional neighborhood operations without the chaos.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-stone-200 sm:text-lg">
                  VecinoHub gives residential admins and residents one clear place to handle communication,
                  events, polling, and fundraising with confidence.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="vh-v3-focus rounded-xl bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
                  data-testid="landing-cta-login"
                >
                  Sign in to VecinoHub
                </Link>
                <Link
                  href="/en"
                  className="vh-v3-focus rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/10"
                  data-testid="landing-cta-legal-hub"
                >
                  View legal center
                </Link>
              </div>
            </div>

            <div
              className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur"
              data-testid="landing-overview-card"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100/80">Platform focus</p>
              <ul className="mt-5 space-y-3">
                {capabilities.map((capability) => (
                  <li
                    key={capability.title}
                    className="rounded-xl border border-white/10 bg-stone-950/40 p-4 shadow-[0_8px_24px_rgba(12,15,15,0.35)]"
                  >
                    <h2 className="text-sm font-semibold text-white">{capability.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-stone-300">{capability.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-7"
            data-testid="landing-legal-section"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100/85">Legal and trust</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-200">
              Access our legal documents directly. These links are always available for provider compliance and
              resident transparency.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {trustLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="vh-v3-focus rounded-xl border border-white/15 bg-stone-900/60 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-teal-200/45 hover:text-teal-100"
                  data-testid={link.testId}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </main>

        <footer
          className="flex flex-col gap-3 border-t border-white/15 pt-5 text-xs text-stone-300 sm:flex-row sm:items-center sm:justify-between"
          data-testid="landing-footer"
        >
          <p>© {new Date().getFullYear()} VecinoHub. Built for trusted neighborhood coordination.</p>
          <div className="flex flex-wrap items-center gap-3">
            {trustLinks.map((link) => (
              <Link
                key={`footer-${link.href}`}
                href={link.href}
                className="vh-v3-focus rounded-md px-2 py-1 text-stone-200 transition hover:bg-white/10 hover:text-white"
                data-testid={`${link.testId}-footer`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
