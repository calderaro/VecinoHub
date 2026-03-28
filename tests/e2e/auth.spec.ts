import { test } from "../../playwright/fixtures/auth";

test.describe("auth", () => {
  test.fixme("register route redirects to login signup tab", async () => {});
  test.fixme("signup form renders", async () => {});
  test.fixme("new user signup enters otp verification step", async () => {});
  test.fixme("signup otp verification completes and redirects to dashboard", async () => {});
  test.fixme("otp resend shows notice", async () => {});
  test.fixme("otp back returns to signup form", async () => {});
  test.fixme("existing user login works", async () => {});
  test.fixme("login error renders on invalid credentials", async () => {});
  test.fixme("unverified login transitions to verification state", async () => {});
  test.fixme("magic link request shows notice", async () => {});
  test.fixme("forgot password link opens forgot-password", async () => {});
  test.fixme("forgot password request step works", async () => {});
  test.fixme("forgot password otp reset completes and auto-signs in", async () => {});
  test.fixme("forgot password back returns to request step", async () => {});
  test.fixme("forgot password back to login works", async () => {});
  test.fixme("google auth starts provider redirect", async () => {});
  test.fixme("logout from user menu ends session", async () => {});
});
