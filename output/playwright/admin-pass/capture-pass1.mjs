import { chromium } from "playwright";
import fs from "node:fs/promises";

const outDir = "/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1";
const redesignBase = "http://127.0.0.1:4173";
const vecinoBase = "http://127.0.0.1:3000";

const sections = [
  { key: "overview", nav: "Overview", route: "/admin" },
  { key: "users", nav: "Users", route: "/admin/users" },
  { key: "groups", nav: "Groups", route: "/admin/groups" },
  { key: "polls", nav: "Polls", route: "/admin/polls" },
  { key: "fundraising", nav: "Fundraising", route: "/admin/fundraising" },
  { key: "events", nav: "Events", route: "/admin/events" },
  { key: "posts", nav: "Posts", route: "/admin/posts" },
];

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function screenshotRedesign(page) {
  await page.goto(redesignBase, { waitUntil: "networkidle" });
  await page.fill("#signin-email", "admin@example.com");
  await page.fill("#signin-password", "admin123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByText("Preview mode:").waitFor({ timeout: 15000 });

  const menuButton = page.locator('button[aria-label^="User menu for"]');
  await menuButton.click();
  await page.getByRole("menuitem", { name: "Admin Panel" }).click();
  await page.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 15000 });

  for (const section of sections) {
    if (section.key !== "overview") {
      await page.getByRole("button", { name: section.nav, exact: true }).first().click();
      await wait(250);
    }
    await page.screenshot({ path: `${outDir}/redesign-${section.key}.png`, fullPage: true });
  }
}

async function screenshotVecino(page) {
  await page.goto(`${vecinoBase}/login`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="auth-login-email"]').fill("admin@vecinohub.local");
  await page.locator('[data-testid="auth-login-password"]').fill("Admin123!");
  await page.locator('[data-testid="auth-login-submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  for (const section of sections) {
    await page.goto(`${vecinoBase}${section.route}`, { waitUntil: "networkidle" });
    await wait(350);
    await page.screenshot({ path: `${outDir}/vecino-${section.key}.png`, fullPage: true });
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await context.newPage();

await fs.mkdir(outDir, { recursive: true });

try {
  await screenshotRedesign(page);
  await screenshotVecino(page);
  console.log("OK");
} finally {
  await context.close();
  await browser.close();
}
