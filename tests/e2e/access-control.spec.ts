import { test } from "../../playwright/fixtures/auth";

test.describe("access control", () => {
  test.fixme("signed-out user redirected from protected routes", async () => {});
  test.fixme("neighbor cannot access admin shell", async () => {});
  test.fixme("neighbor cannot access platform shell", async () => {});
  test.fixme("neighborhood admin cannot access platform shell", async () => {});
  test.fixme("neighborhood admin from neighborhood A cannot access B group pages", async () => {});
  test.fixme(
    "neighborhood admin from neighborhood A cannot access B poll event post fundraising admin pages",
    async () => {}
  );
  test.fixme("resident cannot open foreign group dashboard", async () => {});
  test.fixme("resident cannot open foreign group members", async () => {});
  test.fixme("resident cannot open foreign group poll detail", async () => {});
  test.fixme("resident cannot open foreign group fundraising detail", async () => {});
  test.fixme("resident cannot open foreign group event post detail", async () => {});
  test.fixme("platform admin can access both admin and platform shells", async () => {});
});
