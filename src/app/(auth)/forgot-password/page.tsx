import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";

export default async function ForgotPasswordRoute({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const initialEmail =
    typeof resolvedSearchParams.email === "string"
      ? resolvedSearchParams.email
      : "";

  return <ForgotPasswordPage initialEmail={initialEmail} />;
}
