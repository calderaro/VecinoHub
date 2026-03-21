import { AuthCombinedPage } from "@/components/auth/auth-combined-page";

function sanitizeNextPath(value: string | string[] | undefined) {
  const nextPath = typeof value === "string" ? value : undefined;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

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
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  return <AuthCombinedPage initialTab={initialTab} nextPath={nextPath} />;
}
