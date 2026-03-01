import { AuthCombinedPage } from "@/components/auth/auth-combined-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const initialTab =
    resolvedSearchParams.tab === "signup" ? "signup" : "signin";

  return <AuthCombinedPage initialTab={initialTab} />;
}
