import { expect, test } from "@playwright/test";

test("shared neighborhood join link prefills the slug and lets the user request a group", async ({ page }) => {
  await page.goto("/login?next=%2Fdashboard%2Frequest-access%3Fslug%3Dcolonia-centro");

  await page.getByTestId("auth-login-email").fill("luis@vecinohub.local");
  await page.getByTestId("auth-login-password").fill("User12345!");
  await page.getByTestId("auth-login-submit").click();

  await expect(page).toHaveURL(/\/dashboard\/request-access\?slug=colonia-centro/);
  await expect(page.getByTestId("request-access-dialog")).toBeVisible();

  const slugInput = page.getByTestId("request-access-slug-input");
  await expect(slugInput).toHaveValue("colonia-centro");
  await expect(slugInput).toBeDisabled();
  await expect(page.getByText("Esta colonia fue preseleccionada desde un enlace compartido.")).toBeVisible();

  await expect(page.getByTestId("request-access-neighborhood-result")).toContainText("Colonia Centro");

  const groupSelect = page.getByTestId("request-access-group-select");
  await expect(groupSelect).toBeVisible();
  await groupSelect.selectOption({ label: "Casa 101 - Calle Principal 101" });

  await page.getByTestId("request-access-note").fill("E2E shared join link test");
  await page.getByTestId("request-access-submit").click();

  await expect(page.getByTestId("dashboard-request-access-root")).toContainText("Casa 101");
  await expect(page.getByTestId("dashboard-request-access-root")).toContainText("Pendiente");
});
