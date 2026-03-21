import { redirect } from "next/navigation";

function sanitizeNextPath(value: string | string[] | undefined) {
  const nextPath = typeof value === "string" ? value : undefined;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);
  const params = new URLSearchParams({ tab: "signup" });

  if (nextPath) {
    params.set("next", nextPath);
  }

  redirect(`/login?${params.toString()}`);
}
