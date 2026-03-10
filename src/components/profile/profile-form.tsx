"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [preferredLanguage, setPreferredLanguage] = useState(
    initialPreferredLanguage
  );
  const [isSaving, setIsSaving] = useState(false);

  const usernameTrimmed = username.trim();
  const isUsernameValid =
    usernameTrimmed.length >= 3 &&
    usernameTrimmed.length <= 32 &&
    usernamePattern.test(usernameTrimmed);
  const canSubmit = isUsernameValid && !isSaving;

  const updateProfile = trpc.users.updateProfile.useMutation();

  return (
    <form
      className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
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
      <div className="border-b border-stone-100 px-5 py-4">
        <h2 className="text-base font-semibold text-stone-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
      </div>

      <div className="space-y-6 px-5 py-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 pb-6">
        {initialImage ? (
          <Image
            className="h-16 w-16 rounded-full border border-stone-200 object-cover"
            src={initialImage}
            alt={usernameTrimmed || name}
            width={64}
            height={64}
            sizes="64px"
            unoptimized
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-lg font-semibold text-white">
            {(usernameTrimmed?.[0] ?? name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-stone-800">{name}</p>
          <p className="text-xs text-stone-500">{email}</p>
        </div>
      </div>

      <div>
        <label className="space-y-2 text-sm text-stone-700">
          <span>{t("usernameLabel")}</span>
          <input
            className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
            data-testid="profile-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("usernamePlaceholder")}
            required
          />
          <p className="text-xs text-stone-400">
            {t("usernameHelp")}
          </p>
          {!isUsernameValid ? (
            <p className="text-xs text-red-600">
              {t("usernameError")}
            </p>
          ) : null}
        </label>
      </div>

      <div>
        <label className="space-y-2 text-sm text-stone-700">
          <span>{t("languageLabel")}</span>
          <select
            className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
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
        className="vh-v3-focus rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!canSubmit}
        data-testid="profile-submit"
      >
        {isSaving ? t("saving") : t("save")}
      </button>
      </div>
    </form>
  );
}
