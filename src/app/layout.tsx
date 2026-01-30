import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, Onest } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { Providers } from "./providers";
import { localeCookieName, normalizeLanguage } from "@/lib/locale";
import { getSession } from "@/server/auth";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "VecinoHub",
  description: "Neighborhood administration for house groups.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = await getSession();
  const cookieLocale = cookieStore.get(localeCookieName)?.value ?? null;
  const sessionLocale = session?.user.preferredLanguage ?? null;
  const locale = normalizeLanguage(cookieLocale ?? sessionLocale);
  const messages = (await import(`../messages/${locale}.json`)).default;

  return (
      <html lang={locale} className={`${onest.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
