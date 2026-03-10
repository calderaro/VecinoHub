"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

type ForgotPasswordPageProps = {
  initialEmail: string;
};

type ForgotPasswordStep = "request" | "reset";

function BrandMark() {
  return (
    <div className="mb-8 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5L1.5 6v8h4.5v-4.5h4V14h4.5V6L8 1.5z" fill="white" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-stone-900">VecinoHub</span>
    </div>
  );
}

export function ForgotPasswordPage({ initialEmail }: ForgotPasswordPageProps) {
  const router = useRouter();
  const t = useTranslations("auth.forgotPassword");
  const [step, setStep] = useState<ForgotPasswordStep>("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseInputClass =
    "vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none";

  const canSubmitReset = useMemo(() => {
    return (
      email.trim().length > 0 &&
      otp.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !isResetting
    );
  }, [confirmPassword, email, isResetting, otp, password]);

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t("emailRequired"));
      setMessage(null);
      return;
    }

    setIsRequesting(true);
    setError(null);
    setMessage(null);

    try {
      await authClient.forgetPassword.emailOtp({ email: normalizedEmail });
      setEmail(normalizedEmail);
      setStep("reset");
      setMessage(t("otpSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestError"));
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t("emailRequired"));
      setMessage(null);
      return;
    }

    if (!otp.trim()) {
      setError(t("otpRequired"));
      setMessage(null);
      return;
    }

    if (!password.trim()) {
      setError(t("passwordRequired"));
      setMessage(null);
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      setMessage(null);
      return;
    }

    setIsResetting(true);
    setError(null);
    setMessage(null);

    try {
      await authClient.emailOtp.resetPassword({
        email: normalizedEmail,
        otp: otp.trim(),
        password,
      });

      const signInResult = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      if (signInResult.error || !signInResult.data?.user) {
        setError(
          signInResult.error?.message ?? t("autoLoginError")
        );
        return;
      }

      setMessage(t("success"));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetError"));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="vh-v3 vh-v3-font flex min-h-screen w-full flex-col items-center justify-center bg-stone-50 px-4 py-10">
      <BrandMark />

      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        data-testid="forgot-password-card"
      >
        <div className="px-7 py-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t("eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              {step === "request" ? t("title") : t("resetTitle")}
            </h1>
            <p className="text-sm leading-6 text-stone-500">
              {step === "request" ? t("description") : t("resetDescription")}
            </p>
          </div>

          {step === "request" ? (
            <form className="mt-8 space-y-5" onSubmit={handleRequestOtp}>
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="forgot-password-email"
                >
                  {t("emailLabel")}
                </label>
                <input
                  id="forgot-password-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  autoComplete="email"
                  data-testid="forgot-password-email"
                  className={baseInputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isRequesting}
                data-testid="forgot-password-request"
                className="vh-v3-focus flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequesting ? t("requestSubmitting") : t("requestAction")}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="forgot-password-email-readonly"
                >
                  {t("emailLabel")}
                </label>
                <input
                  id="forgot-password-email-readonly"
                  type="email"
                  value={email}
                  readOnly
                  data-testid="forgot-password-email-readonly"
                  className={`${baseInputClass} bg-stone-50 text-stone-500`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="forgot-password-otp"
                >
                  {t("otpLabel")}
                </label>
                <input
                  id="forgot-password-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.currentTarget.value)}
                  data-testid="forgot-password-otp"
                  className={baseInputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="forgot-password-new-password"
                >
                  {t("newPasswordLabel")}
                </label>
                <input
                  id="forgot-password-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  data-testid="forgot-password-new-password"
                  className={baseInputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="forgot-password-confirm-password"
                >
                  {t("confirmPasswordLabel")}
                </label>
                <input
                  id="forgot-password-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                  data-testid="forgot-password-confirm-password"
                  className={baseInputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setError(null);
                    setMessage(null);
                    setOtp("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  data-testid="forgot-password-back"
                  className="vh-v3-focus flex w-full items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitReset}
                  data-testid="forgot-password-submit"
                  className="vh-v3-focus flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetting ? t("resetSubmitting") : t("resetAction")}
                </button>
              </div>
            </form>
          )}

          {error ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
              data-testid="forgot-password-error"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
              data-testid="forgot-password-notice"
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-7 py-4 text-center">
          <Link
            href="/login"
            className="vh-v3-focus text-xs font-medium text-teal-600 transition-colors hover:text-teal-700"
            data-testid="forgot-password-back-login"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
