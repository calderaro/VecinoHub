"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type GroupMember = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
};

export function GroupMembers({
  groupId,
  canManage,
  members,
}: {
  groupId: string;
  canManage: boolean;
  members: GroupMember[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("dashboard.groupMembers");
  const [email, setEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<GroupMember | null>(null);
  const canSubmit = email.trim().length > 0;

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      addToast(t("toasts.added"), "success");
      setEmail("");
      setAddError(null);
      setAddOpen(false);
      router.refresh();
    },
    onError: (err) => {
      setAddError(err.message);
      addToast(err.message, "error");
    },
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      addToast(t("toasts.removed"), "success");
      setPendingRemove(null);
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <div className="mt-4 space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("title")}
          </p>
          <button
            className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
            type="button"
            data-testid="group-members-add"
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
          >
            {t("add")}
          </button>
        </div>
      ) : null}

      {members.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
      ) : (
        members.map((member) => {
          const displayName = member.username ?? member.name;
          const secondary = member.username ? member.name : member.email;
          return (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2"
              data-testid={`group-members-row-${member.id}`}
            >
              <div className="flex items-center gap-3">
                {member.image ? (
                  <Image
                    className="h-9 w-9 rounded-full border border-[color:var(--stroke)] object-cover"
                    src={member.image}
                    alt={displayName}
                    width={36}
                    height={36}
                    sizes="36px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] text-xs font-semibold text-[color:var(--muted-strong)]">
                    {(displayName?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {displayName}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">{secondary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[color:var(--stroke)] px-2 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)]">
                  {t(`roles.${member.role}`)}
                </span>
                {canManage ? (
                  <button
                    className="text-xs uppercase tracking-[0.2em] text-rose-300 hover:text-rose-200"
                    type="button"
                    onClick={() => setPendingRemove(member)}
                    disabled={removeMember.isPending}
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("addDialog.title")}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("addDialog.subtitle")}
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setAddError(null);
                if (!canSubmit) {
                  addToast(t("addDialog.emailRequired"), "error");
                  return;
                }
                addMember.mutate({ groupId, email });
              }}
            >
              <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
                <span>{t("addDialog.emailLabel")}</span>
                <input
                  className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAddError(null);
                  }}
                  placeholder={t("addDialog.emailPlaceholder")}
                  type="email"
                  required
                />
              </label>
              {addError ? (
                <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {addError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                  type="button"
                  data-testid="group-members-add-cancel"
                  onClick={() => {
                    setAddError(null);
                    setAddOpen(false);
                  }}
                  disabled={addMember.isPending}
                >
                  {t("addDialog.cancel")}
                </button>
                <button
                  className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  data-testid="group-members-add-submit"
                  disabled={!canSubmit || addMember.isPending}
                >
                  {addMember.isPending ? t("addDialog.adding") : t("addDialog.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("removeDialog.title")}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("removeDialog.body", {
                name: pendingRemove.username ?? pendingRemove.name,
              })}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                data-testid="group-members-remove-cancel"
                onClick={() => setPendingRemove(null)}
                disabled={removeMember.isPending}
              >
                {t("removeDialog.cancel")}
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="group-members-remove-confirm"
                onClick={() =>
                  removeMember.mutate({
                    groupId,
                    userId: pendingRemove.id,
                  })
                }
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? t("removeDialog.removing") : t("removeDialog.remove")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
