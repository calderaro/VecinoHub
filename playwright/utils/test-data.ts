export const seededAccounts = {
  platformAdmin: {
    email: "admin@vecinohub.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "",
    role: "platform_admin",
  },
  centroAdmin: {
    email: "ana@vecinohub.local",
    password: process.env.SEED_USER_PASSWORD ?? "",
    role: "user",
  },
  surAdmin: {
    email: "luis@vecinohub.local",
    password: process.env.SEED_USER_PASSWORD ?? "",
    role: "user",
  },
} as const;

export type SeededAccountKey = keyof typeof seededAccounts;

export function createDisposableId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function disposableLabel(prefix: string) {
  return `${prefix} ${createDisposableId()}`;
}

export function disposableEmail(prefix = "e2e-user") {
  return `${prefix}-${createDisposableId()}@vecinohub.local`;
}

export function assertSeedCredentialsConfigured() {
  if (!seededAccounts.platformAdmin.password || !seededAccounts.centroAdmin.password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD must be set before running seeded Playwright login helpers."
    );
  }
}
