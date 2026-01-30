import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { localeCookieName, normalizeLanguage } from "@/lib/locale";
import { getSession } from "@/server/auth";

function getBrowserLocale(acceptLanguage: string | null) {
  if (!acceptLanguage) {
    return null;
  }

  const [primary] = acceptLanguage.split(",");
  if (!primary) {
    return null;
  }

  return primary.trim() || null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const session = await getSession();
  const cookieLocale = cookieStore.get(localeCookieName)?.value ?? null;
  const sessionLocale = session?.user.preferredLanguage ?? null;
  const browserLocale = getBrowserLocale(headerStore.get("accept-language"));
  const locale = normalizeLanguage(cookieLocale ?? sessionLocale ?? browserLocale);
  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
