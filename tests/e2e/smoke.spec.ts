import { expect, test } from "../../playwright/fixtures/auth";

import { makeGroupName, makeNeighborhoodName, makeSlugSuffix } from "../../playwright/fixtures/data";
import { appRoutes } from "../../playwright/utils/routes";
import { adminSelectors, authSelectors, platformSelectors, shellSelectors } from "../../playwright/utils/selectors";

test.describe.configure({ mode: "serial" });

test.describe("smoke", () => {
  test("platform admin login and platform page loads", async ({ page, loginAs }) => {
    await loginAs("platformAdmin");

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(appRoutes.platform());

    await expect(page).toHaveURL(/\/platform$/);
    await expect(page.getByTestId(platformSelectors.neighborhoodsForm)).toBeVisible();
    await expect(page.getByTestId("platform-neighborhoods-list")).toBeVisible();
  });

  test("resident login and dashboard loads", async ({ page, loginAs }) => {
    await loginAs("centroAdmin");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("dashboard-group-list")).toBeVisible();
    await expect(page.locator('[data-testid^="dashboard-group-card-"]')).toHaveCount(2);
  });

  test("resident can navigate all dashboard sections", async ({ page, loginAs }) => {
    await loginAs("centroAdmin");

    await page.locator('[data-testid^="dashboard-group-card-"]').first().click();

    await expect(page.getByTestId(shellSelectors.dashboardOverviewRoot)).toBeVisible();
    await expect(page.getByTestId("dashboard-overview-posts")).toBeVisible();
    await expect(page.getByTestId("dashboard-overview-events")).toBeVisible();
    await expect(page.getByTestId("dashboard-overview-polls")).toBeVisible();
    await expect(page.getByTestId("dashboard-overview-fundraising")).toBeVisible();
    await expect(page.getByTestId("dashboard-overview-members")).toBeVisible();

    const groupDashboardUrl = page.url();

    await page.goto(`${groupDashboardUrl}/members`);
    await expect(page.getByTestId("dashboard-members-list")).toBeVisible();

    await page.goto(`${groupDashboardUrl}/polls`);
    await expect(page.getByTestId("dashboard-polls-table")).toBeVisible();

    await page.goto(`${groupDashboardUrl}/fundraising`);
    await expect(page.getByTestId("dashboard-fundraising-table")).toBeVisible();

    await page.goto(`${groupDashboardUrl}/events`);
    await expect(page.getByTestId("dashboard-events-table")).toBeVisible();

    await page.goto(`${groupDashboardUrl}/posts`);
    await expect(page.getByTestId("dashboard-posts-table")).toBeVisible();
  });

  test("admin overview loads", async ({ page, loginAs }) => {
    await loginAs("centroAdmin");

    await page.goto(appRoutes.admin());
    await expect(page.getByTestId("admin-neighborhood-list")).toBeVisible();

    await page
      .locator('[data-testid^="admin-neighborhood-card-"]')
      .filter({ hasText: "Colonia Centro" })
      .click();

    await expect(page.getByTestId("admin-overview-root")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-polls")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-fundraising")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-events")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-posts")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-users")).toBeVisible();
    await expect(page.getByTestId("admin-overview-stats-groups")).toBeVisible();
  });

  test("admin can create one disposable group", async ({ page, loginAs }) => {
    const groupName = makeGroupName();

    await loginAs("centroAdmin");
    await page.goto(appRoutes.admin());
    const neighborhoodCard = page
      .locator('[data-testid^="admin-neighborhood-card-"]')
      .filter({ hasText: "Colonia Centro" });
    const neighborhoodHref = await neighborhoodCard.getAttribute("href");
    const neighborhoodId = neighborhoodHref?.split("/").pop() ?? "";

    await page.goto(`${appRoutes.adminGroups(neighborhoodId)}/new`);

    await page.getByTestId("group-form-name").fill(groupName);
    await page.getByTestId("group-form-address").fill("E2E Address 101");
    await page.getByTestId("group-form-submit").click();

    await expect(page).toHaveURL(/\/admin\/.+\/groups$/);
    await expect(page.getByTestId(adminSelectors.groupsTable)).toBeVisible();
    await expect(page.getByText(groupName)).toBeVisible();
  });

  test("platform can create one disposable neighborhood", async ({ page, loginAs }) => {
    const neighborhoodName = makeNeighborhoodName();
    const slug = `e2e-${makeSlugSuffix()}`;

    await loginAs("platformAdmin");
    await page.goto(appRoutes.platform());

    await page.getByTestId("platform-neighborhood-name").fill(neighborhoodName);
    await page.getByTestId("platform-neighborhood-slug").fill(slug);
    await page.getByTestId("platform-neighborhood-submit").click();

    await expect(page.getByTestId("platform-neighborhoods-list")).toBeVisible();
    await expect(page.getByText(neighborhoodName)).toBeVisible();
    await expect(page.getByText(`/${slug}`)).toBeVisible();
  });

  test("logout works", async ({ page, loginAs }) => {
    await loginAs("centroAdmin");

    await page.getByTestId(shellSelectors.userMenuTrigger).click();
    await page.getByTestId("user-menu-signout").click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId(authSelectors.loginEmail)).toBeVisible();
  });
});
