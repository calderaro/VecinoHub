import { test } from "../../playwright/fixtures/auth";

test.describe("session security", () => {
  test.fixme("inactive user with live session is denied after refresh", async () => {});
  test.fixme("inactive user cannot login with password", async () => {});
  test.fixme("inactive user cannot create new session through reset flow", async () => {});
  test.fixme("magic-link flow is blocked or fails for inactive user", async () => {});
  test.fixme("password attempts hit rate limit eventually", async () => {});
  test.fixme("magic-link attempts hit rate limit eventually", async () => {});
  test.fixme("missing smtp auth flows fail without leaking otp or links", async () => {});
});
