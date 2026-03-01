"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { normalizeLanguage, setLocaleCookie } from "@/lib/locale";
import { trpc } from "@/lib/trpc";

type AuthTab = "signin" | "signup";

type AuthCombinedPageProps = {
  initialTab: AuthTab;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthCombinedPage({ initialTab }: AuthCombinedPageProps) {
  const router = useRouter();
  const tCombined = useTranslations("auth.combined");
  const tLogin = useTranslations("auth.login");
  const tRegister = useTranslations("auth.register");
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [hasRequestedResetOtp, setHasRequestedResetOtp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const updateProfile = trpc.users.updateProfile.useMutation();
  const isBusy = isSubmitting || isMagicLinkSubmitting || isResetSubmitting;

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    try {
      const { data } = await authClient.signIn.email({ email, password });

      if (!data?.user) {
        setError(tLogin("errors.invalid"));
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : tLogin("errors.login"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const preferredLanguage = normalizeLanguage(
      typeof navigator !== "undefined" ? navigator.language : undefined
    );

    try {
      const { data } = await authClient.signUp.email({ name, email, password });

      if (!data?.user) {
        setError(tRegister("errors.createAccount"));
        return;
      }

      try {
        await updateProfile.mutateAsync({ preferredLanguage });
      } catch {
        // Best effort. The user can update profile language later.
      }

      setLocaleCookie(preferredLanguage);

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tRegister("errors.registration")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialSignIn(provider: "google") {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch {
      setNotice(tCombined("socialError"));
      setIsSubmitting(false);
    }
  }

  async function handleMagicLinkSignIn() {
    const email = loginEmail.trim();

    if (!email) {
      setError(null);
      setNotice(tCombined("magicLinkEmailRequired"));
      return;
    }

    setIsMagicLinkSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      });
      setNotice(tCombined("magicLinkSent"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : tCombined("magicLinkError"));
    } finally {
      setIsMagicLinkSubmitting(false);
    }
  }

  async function handleRequestPasswordResetOtp() {
    const email = loginEmail.trim();

    if (!email) {
      setError(null);
      setNotice(tCombined("passwordResetEmailRequired"));
      return;
    }

    setIsResetSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await authClient.forgetPassword.emailOtp({ email });
      setHasRequestedResetOtp(true);
      setNotice(tCombined("passwordResetOtpSent"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : tCombined("passwordResetError"));
    } finally {
      setIsResetSubmitting(false);
    }
  }

  async function handleResetPasswordWithOtp() {
    const email = loginEmail.trim();
    const otp = resetOtp.trim();
    const newPassword = resetPasswordValue.trim();

    if (!email) {
      setNotice(tCombined("passwordResetEmailRequired"));
      return;
    }

    if (!otp) {
      setNotice(tCombined("passwordResetOtpRequired"));
      return;
    }

    if (!newPassword) {
      setNotice(tCombined("passwordResetNewPasswordRequired"));
      return;
    }

    setIsResetSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });
      setResetOtp("");
      setResetPasswordValue("");
      setHasRequestedResetOtp(false);
      setNotice(tCombined("passwordResetSuccess"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : tCombined("passwordResetError"));
    } finally {
      setIsResetSubmitting(false);
    }
  }

  const baseInputClass =
    "vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none";
  const baseButtonClass =
    "vh-v3-focus flex w-full items-center justify-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="vh-v3 vh-v3-font flex min-h-screen w-full flex-col items-center justify-center bg-stone-50 px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5L1.5 6v8h4.5v-4.5h4V14h4.5V6L8 1.5z" fill="white" />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-stone-900">VecinoHub</span>
      </div>

      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        data-testid="auth-shell-card"
      >
        <div className="px-7 py-8">
          <div
            role="tablist"
            aria-label={tCombined("tabLabel")}
            className="relative mb-6 flex rounded-lg bg-stone-100 p-1"
          >
            <div
              className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-md border border-stone-200 bg-white shadow-sm transition-transform duration-200"
              style={{
                transform:
                  tab === "signup"
                    ? "translateX(calc(100% + 8px))"
                    : "translateX(0)",
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signin"}
              onClick={() => {
                setTab("signin");
                setError(null);
              }}
              className={`vh-v3-focus relative flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "signin"
                  ? "text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tCombined("tabs.signIn")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
              className={`vh-v3-focus relative flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "signup"
                  ? "text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tCombined("tabs.signUp")}
            </button>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                void handleSocialSignIn("google");
              }}
              disabled={isBusy}
              className={baseButtonClass}
              data-testid="auth-social-google"
            >
              <GoogleIcon />
              {tCombined("social.google")}
            </button>
          </div>

          <div className="relative my-5" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-stone-400">
                {tCombined("divider")}
              </span>
            </div>
          </div>

          {tab === "signin" ? (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-stone-700" htmlFor="auth-email">
                  {tLogin("email")}
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.currentTarget.value)}
                  data-testid="auth-login-email"
                  className={baseInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-medium text-stone-700"
                    htmlFor="auth-password"
                  >
                    {tLogin("password")}
                  </label>
                  <button
                    type="button"
                    className="vh-v3-focus text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
                    onClick={() => {
                      void handleRequestPasswordResetOtp();
                    }}
                    data-testid="auth-reset-request"
                  >
                    {tCombined("forgotPassword")}
                  </button>
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  data-testid="auth-login-password"
                  className={baseInputClass}
                />
              </div>

              {hasRequestedResetOtp ? (
                <>
                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-stone-700"
                      htmlFor="auth-reset-otp"
                    >
                      {tCombined("passwordResetOtpLabel")}
                    </label>
                    <input
                      id="auth-reset-otp"
                      type="text"
                      inputMode="numeric"
                      value={resetOtp}
                      onChange={(event) => setResetOtp(event.currentTarget.value)}
                      data-testid="auth-reset-otp"
                      className={baseInputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-stone-700"
                      htmlFor="auth-reset-password"
                    >
                      {tCombined("passwordResetNewPasswordLabel")}
                    </label>
                    <input
                      id="auth-reset-password"
                      type="password"
                      autoComplete="new-password"
                      value={resetPasswordValue}
                      onChange={(event) => setResetPasswordValue(event.currentTarget.value)}
                      data-testid="auth-reset-password"
                      className={baseInputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleResetPasswordWithOtp();
                    }}
                    disabled={isBusy}
                    data-testid="auth-reset-submit"
                    className="vh-v3-focus flex w-full items-center justify-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResetSubmitting
                      ? tCombined("passwordResetSubmitting")
                      : tCombined("passwordResetAction")}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleMagicLinkSignIn();
                }}
                disabled={isBusy}
                data-testid="auth-login-magic-link"
                className="vh-v3-focus flex w-full items-center justify-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMagicLinkSubmitting
                  ? tCombined("magicLinkSending")
                  : tCombined("magicLinkAction")}
              </button>

              {error ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
                  data-testid="auth-login-error"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isBusy}
                data-testid="auth-login-submit"
                className="vh-v3-focus flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? tLogin("signingIn") : tLogin("action")}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-stone-700" htmlFor="auth-name">
                  {tRegister("fullName")}
                </label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  data-testid="auth-register-name"
                  className={baseInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-stone-700" htmlFor="auth-signup-email">
                  {tRegister("email")}
                </label>
                <input
                  id="auth-signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  data-testid="auth-register-email"
                  className={baseInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-stone-700"
                  htmlFor="auth-signup-password"
                >
                  {tRegister("password")}
                </label>
                <input
                  id="auth-signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  data-testid="auth-register-password"
                  className={baseInputClass}
                />
              </div>

              {error ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
                  data-testid="auth-register-error"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isBusy}
                data-testid="auth-register-submit"
                className="vh-v3-focus flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? tRegister("creating") : tRegister("action")}
              </button>
            </form>
          )}

          {notice ? (
            <p
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
              data-testid="auth-login-notice"
            >
              {notice}
            </p>
          ) : null}
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-7 py-4 text-center">
          <p className="text-xs text-stone-500">
            {tab === "signin" ? (
              <>
                {tCombined("footer.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="vh-v3-focus font-medium text-teal-600 transition-colors hover:text-teal-700"
                >
                  {tCombined("tabs.signUp")}
                </button>
              </>
            ) : (
              <>
                {tCombined("footer.hasAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className="vh-v3-focus font-medium text-teal-600 transition-colors hover:text-teal-700"
                >
                  {tCombined("tabs.signIn")}
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-stone-400">
        {tCombined("legal")}
      </p>

      <div className="sr-only" data-testid="auth-shell" />
    </div>
  );
}
