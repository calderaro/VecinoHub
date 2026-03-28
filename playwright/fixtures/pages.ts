import type { Page } from "playwright/test";

import { appRoutes } from "../utils/routes";
import { shellSelectors } from "../utils/selectors";

export async function openUserMenu(page: Page) {
  await page.getByTestId(shellSelectors.userMenuTrigger).click();
}

export async function gotoResidentGroup(page: Page, groupId: string) {
  await page.goto(appRoutes.dashboardGroup(groupId));
}

export async function gotoAdminNeighborhood(page: Page, neighborhoodId: string) {
  await page.goto(appRoutes.adminNeighborhood(neighborhoodId));
}

export async function gotoPlatformNeighborhood(page: Page, neighborhoodId: string) {
  await page.goto(appRoutes.platformNeighborhood(neighborhoodId));
}

export async function signOut(page: Page) {
  await openUserMenu(page);
  await page.getByTestId(shellSelectors.userMenuSignOut).click();
}
