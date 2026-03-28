import { expect, test as base, type Page } from "playwright/test";

import { appRoutes } from "../utils/routes";
import { authSelectors, shellSelectors } from "../utils/selectors";
import {
  assertSeedCredentialsConfigured,
  seededAccounts,
  type SeededAccountKey,
} from "../utils/test-data";

type AuthFixtures = {
  seededAccounts: typeof seededAccounts;
  loginAs: (accountKey: SeededAccountKey, targetPage?: Page) => Promise<void>;
  signOut: (targetPage?: Page) => Promise<void>;
};

async function loginWithCredentials(page: Page, accountKey: SeededAccountKey) {
  assertSeedCredentialsConfigured();
  const account = seededAccounts[accountKey];

  await page.goto(appRoutes.login());
  await page.getByTestId(authSelectors.loginEmail).fill(account.email);
  await page.getByTestId(authSelectors.loginPassword).fill(account.password);
  await page.getByTestId(authSelectors.loginSubmit).click();
}

async function signOutFromPage(page: Page) {
  await page.getByTestId(shellSelectors.userMenuTrigger).click();
  await page.getByTestId(shellSelectors.userMenuSignOut).click();
}

export const test = base.extend<AuthFixtures>({
  seededAccounts: async ({}, runFixture: (value: typeof seededAccounts) => Promise<void>) => {
    await runFixture(seededAccounts);
  },
  loginAs: async (
    { page }: { page: Page },
    runFixture: (value: AuthFixtures["loginAs"]) => Promise<void>
  ) => {
    await runFixture(async (accountKey, targetPage = page) => {
      await loginWithCredentials(targetPage, accountKey);
    });
  },
  signOut: async (
    { page }: { page: Page },
    runFixture: (value: AuthFixtures["signOut"]) => Promise<void>
  ) => {
    await runFixture(async (targetPage = page) => {
      await signOutFromPage(targetPage);
    });
  },
});

export { expect, loginWithCredentials, seededAccounts, signOutFromPage };
export type { SeededAccountKey };
