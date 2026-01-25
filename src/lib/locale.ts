export const supportedLanguages = ["es", "en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: SupportedLanguage = "es";
export const localeCookieName = "vh_locale";

export function normalizeLanguage(value?: string | null): SupportedLanguage {
  if (!value) {
    return defaultLanguage;
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith("es")) {
    return "es";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }

  return defaultLanguage;
}

export function setLocaleCookie(language: SupportedLanguage) {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${localeCookieName}=${language}; Path=/; Max-Age=${maxAge}`;
}
