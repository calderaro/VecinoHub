import { expect, test } from "../../playwright/fixtures/auth";

import { disposableLabel } from "../../playwright/utils/test-data";
import { appRoutes } from "../../playwright/utils/routes";

test.describe.configure({ mode: "serial" });

test.describe("neighborhood access requests screen", () => {
  test("neighborhood admin reaches the access requests screen from the overview", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(60_000);
    await loginAs("centroAdmin");

    await page.goto(appRoutes.admin());
    await page
      .getByTestId("admin-neighborhood-list")
      .getByText("Colonia Centro")
      .click();

    await expect(page.getByTestId("admin-overview-root")).toBeVisible();
    await page.getByTestId("admin-overview-stats-requests").click();

    await expect(page.getByTestId("admin-requests-root")).toBeVisible();
    await expect(page.getByTestId("admin-requests-title")).toBeVisible();
    await expect(page.getByTestId("neighborhood-access-requests-tabs")).toBeVisible();
    await expect(
      page.getByTestId("neighborhood-access-requests-panel-pending")
    ).toBeVisible();

    await page.getByTestId("neighborhood-access-requests-tab-history").click();
    await expect(
      page.getByTestId("neighborhood-access-requests-panel-history")
    ).toBeVisible();
  });

  test("neighborhood admin approves a request from the neighborhood screen", async ({
    page,
    loginAs,
    signOut,
  }) => {
    test.setTimeout(90_000);
    const groupName = disposableLabel("Neighborhood Request Group");

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
    await page.getByTestId("group-form-address").fill("Neighborhood Requests 101");
    await page.getByTestId("group-form-submit").click();
    await expect(page.getByTestId("admin-groups-table")).toBeVisible();

    await signOut();

    await loginAs("surAdmin");
    await page.goto(appRoutes.dashboardRequestAccess());

    await page.getByTestId("request-access-open-dialog").click();
    await expect(page.getByTestId("request-access-dialog")).toBeVisible();
    await page.getByTestId("request-access-slug-input").fill("colonia-centro");
    await page.getByTestId("request-access-slug-submit").click();
    await expect(page.getByTestId("request-access-neighborhood-result")).toBeVisible();

    const groupSelect = page.getByTestId("request-access-group-select");
    await expect(groupSelect.locator("option", { hasText: groupName })).toBeAttached();
    await expect(groupSelect).toBeEnabled();
    await expect(groupSelect.locator("option", { hasText: groupName })).not.toContainText(
      "Neighborhood Requests 101"
    );
    await groupSelect.selectOption({ label: groupName });
    await page.getByTestId("request-access-note").fill("Solicitud para prueba de pantalla de colonia.");
    await page.getByTestId("request-access-submit").click();

    await expect(
      page.locator('[data-testid^="request-access-row-"]').filter({ hasText: groupName })
    ).toHaveCount(1);

    await signOut();

    await loginAs("centroAdmin");
    await page.goto(appRoutes.adminRequests(neighborhoodId));

    await expect(page.getByTestId("admin-requests-root")).toBeVisible();

    const pendingRow = page
      .locator('[data-testid^="neighborhood-access-request-row-"]')
      .filter({ hasText: groupName });

    await expect(pendingRow).toHaveCount(1);
    await expect(pendingRow).toContainText("luis@vecinohub.local");

    await pendingRow.locator('[data-testid^="neighborhood-access-request-approve-"]').click();
    await expect(
      page
        .locator('[data-testid^="neighborhood-access-request-row-"]')
        .filter({ hasText: groupName })
    ).toHaveCount(0);

    await page.getByTestId("neighborhood-access-requests-tab-history").click();
    await expect(
      page
        .locator('[data-testid^="neighborhood-access-request-history-row-"]')
        .filter({ hasText: groupName })
    ).toHaveCount(1);
  });
});
