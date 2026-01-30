"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { setLocaleCookie } from "@/lib/locale";

const usernamePattern = /^[a-zA-Z0-9._-]+$/;

export function ProfileForm({
  name,
  email,
  initialUsername,
  initialImage,
  initialPreferredLanguage,
}: {
  name: string;
  email: string;
  initialUsername: string | null;
  initialImage: string | null;
  initialPreferredLanguage: "es" | "en";
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("profile");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [image, setImage] = useState(initialImage ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    initialPreferredLanguage
  );
  const [isSaving, setIsSaving] = useState(false);

  const usernameTrimmed = username.trim();
  const imageTrimmed = image.trim();
  const isUsernameValid =
    usernameTrimmed.length >= 3 &&
    usernameTrimmed.length <= 32 &&
    usernamePattern.test(usernameTrimmed);

  const isImageValid = useMemo(() => {
    if (!imageTrimmed) {
      return true;
    }
    try {
      new URL(imageTrimmed);
      return true;
    } catch {
      return false;
    }
  }, [imageTrimmed]);

  const canSubmit = isUsernameValid && isImageValid && !isSaving;

  const updateProfile = trpc.users.updateProfile.useMutation();

  return (
    <form
      className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) {
          addToast(t("validationError"), "error");
          return;
        }
        setIsSaving(true);
        try {
          await updateProfile.mutateAsync({
            username: usernameTrimmed,
            image: imageTrimmed ? imageTrimmed : null,
            preferredLanguage,
          });
          setLocaleCookie(preferredLanguage);
          addToast(t("updated"), "success");
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : t("updateError");
          addToast(message, "error");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        {t("subtitle")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {imageTrimmed ? (
          <Image
            className="h-16 w-16 rounded-full border border-[color:var(--stroke)] object-cover"
            src={imageTrimmed}
            alt={usernameTrimmed || name}
            width={64}
            height={64}
            sizes="64px"
            unoptimized
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] text-lg font-semibold text-[color:var(--muted-strong)]">
            {(usernameTrimmed?.[0] ?? name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm text-[color:var(--muted-strong)]">{name}</p>
          <p className="text-xs text-[color:var(--muted)]">{email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("usernameLabel")}</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="profile-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("usernamePlaceholder")}
            required
          />
          <p className="text-xs text-[color:var(--muted)]">
            {t("usernameHelp")}
          </p>
          {!isUsernameValid ? (
            <p className="text-xs text-rose-200">
              {t("usernameError")}
            </p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("photoLabel")}</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="profile-photo"
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder={t("photoPlaceholder")}
            type="url"
          />
          {!isImageValid ? (
            <p className="text-xs text-rose-200">
              {t("photoError")}
            </p>
          ) : null}
        </label>
      </div>

      <div className="mt-5">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("languageLabel")}</span>
          <select
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="profile-language"
            value={preferredLanguage}
            onChange={(event) =>
              setPreferredLanguage(event.target.value as "es" | "en")
            }
          >
            <option value="es">{t("languageSpanish")}</option>
            <option value="en">{t("languageEnglish")}</option>
          </select>
        </label>
      </div>

      <button
        className="mt-5 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#0d1515] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!canSubmit}
        data-testid="profile-submit"
      >
        {isSaving ? t("saving") : t("save")}
      </button>
    </form>
  );
}
