import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { HelpContextPanel } from "@/components/help/HelpContextPanel";
import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, getFundStatusVariant } from "@/components/funds/utils";
import { listContextHelpByScreen, resolveHelpRole } from "@/lib/help-content";
import { listNeighborhoodFunds } from "@/services/funds";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentFundsPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId } = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  const [funds, locale, t, tStatus] = await Promise.all([
    listNeighborhoodFunds(serviceContext, { neighborhoodId: group.neighborhoodId }),
    getLocale(),
    getTranslations("dashboard.funds.list"),
    getTranslations("status"),
  ]);
  const helpRole = resolveHelpRole({
    accountRole: session.user.role,
    viewerCanManage: group.viewerCanManage,
    viewerMembershipRole: group.viewerMembershipRole,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">{t("label")}</p>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-[color:var(--muted)]">{t("subtitle")}</p>
          </div>
          <HelpContextPanel
            entries={listContextHelpByScreen({
              locale,
              screenKey: "dashboard-funds",
              role: helpRole,
            })}
            screenKey="dashboard-funds"
          />
        </div>
      </header>

      {funds.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-8 text-sm text-[color:var(--muted)]" data-testid="dashboard-funds-empty">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {funds.map((fund) => (
            <Link
              key={fund.id}
              href={`/dashboard/${groupId}/fund/${fund.id}`}
              className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm transition hover:border-[color:var(--accent)]"
              data-testid={`dashboard-fund-card-${fund.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{fund.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">{fund.description || t("noDescription")}</p>
                </div>
                <StatusBadge variant={getFundStatusVariant(fund.status) as never} label={tStatus(fund.status)} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("balance")}</p>
                  <p className="mt-1 font-semibold text-stone-900">
                    {formatCurrency(fund.balance, locale, fund.currencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("periods")}</p>
                  <p className="mt-1 font-semibold text-stone-900">{fund.openPeriods}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("pending")}</p>
                  <p className="mt-1 font-semibold text-stone-900">{fund.pendingPayments}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
