"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

export function GroupCreateForm({ adminUserId }: { adminUserId: string }) {
  const router = useRouter();
  const t = useTranslations("admin.groupForm");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isValid = name.trim().length > 0;

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => {
      setName("");
      setAddress("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <form
      className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError(t("nameRequired"));
          return;
        }
        createGroup.mutate({
          name,
          address: address || undefined,
          adminUserId,
        });
      }}
    >
      <h2 className="text-lg font-semibold">{t("createTitle")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("fields.name")}</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="group-create-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("fields.address")}</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="group-create-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      <button
        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#0d1515] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createGroup.isPending}
        data-testid="group-create-submit"
      >
        {createGroup.isPending ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}
