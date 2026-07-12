import { expect, test } from "../../playwright/fixtures/auth";

import { disposableLabel } from "../../playwright/utils/test-data";
import { appRoutes } from "../../playwright/utils/routes";

test.describe.configure({ mode: "serial" });

test.describe("group access requests", () => {
  test("registered resident can request access and manager can approve it", async ({
    page,
    loginAs,
    signOut,
  }) => {
    const groupName = disposableLabel("Request Group");

    await loginAs("centroAdmin");
    await page.goto(appRoutes.admin());
    const neighborhoodCard = page
      .locator('[data-testid^="admin-neighborhood-card-"]')
      .filter({ hasText: "Colonia Centro" });
    const neighborhoodHref = await neighborhoodCard.getAttribute("href");
    const neighborhoodId = neighborhoodHref?.split("/").pop() ?? "";
    await page.goto(appRoutes.adminGroups(neighborhoodId));

    await page.getByTestId("admin-groups-add").click();
    await page.getByTestId("group-form-name").fill(groupName);
    await page.getByTestId("group-form-address").fill("Request Access 101");
    await page.getByTestId("group-form-submit").click();

    await expect(page.getByTestId("admin-groups-table")).toBeVisible();
    await page.getByRole("link", { name: groupName }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    await signOut();

    await loginAs("surAdmin");
    await page.goto(appRoutes.dashboardRequestAccess());

    await page.getByTestId("request-access-open-dialog").click();
    await expect(page.getByTestId("request-access-dialog")).toBeVisible();
    await page.getByTestId("request-access-slug-input").fill("colonia-centro");
    await page.getByTestId("request-access-slug-submit").click();
    await expect(page.getByTestId("request-access-neighborhood-result")).toBeVisible();

    await page.getByTestId("request-access-group-select").selectOption({ label: groupName });
    await page.getByTestId("request-access-note").fill("Soy residente de esta casa.");
    await page.getByTestId("request-access-submit").click();

    await expect(
      page.locator('[data-testid^="request-access-row-"]').filter({ hasText: groupName })
    ).toHaveCount(1);

    await signOut();

    await loginAs("centroAdmin");
    await page.goto(appRoutes.adminGroups(neighborhoodId));
    await page.getByTestId("admin-groups-search").fill(groupName);
    await page.keyboard.press("Enter");
    await page.getByRole("link", { name: groupName }).click();
    await page.getByTestId("group-members-tab-requests").click();

    const pendingRequestRow = page
      .locator('[data-testid^="group-access-request-row-"]')
      .filter({ hasText: "luis@vecinohub.local" });

    await expect(pendingRequestRow).toHaveCount(1);
    await pendingRequestRow.locator('[data-testid^="group-access-request-approve-"]').click();
    await expect(
      page.locator('[data-testid^="group-access-request-row-"]').filter({
        hasText: "luis@vecinohub.local",
      })
    ).toHaveCount(0);

    await signOut();

    await loginAs("surAdmin");
    await page.goto(appRoutes.dashboardRequestAccess());

    const historyRow = page
      .locator("article")
      .filter({ hasText: groupName });

    await expect(historyRow).toHaveCount(1);
    await historyRow.locator('[data-testid^="request-access-open-group-"]').click();
    await expect(page).toHaveURL(/\/dashboard\/.+/);
    await expect(page.getByTestId("dashboard-overview-root")).toBeVisible();
  });
});
