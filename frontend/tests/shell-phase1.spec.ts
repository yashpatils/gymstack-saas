import { expect, test } from "playwright/test";

const QA_EMAIL = process.env.QA_EMAIL ?? process.env.E2E_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD ?? process.env.E2E_PASSWORD;
const hasCredentials = Boolean(QA_EMAIL && QA_PASSWORD);

async function login(page: import("playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(QA_EMAIL!);
  await page.getByLabel("Password").fill(QA_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/platform/, { timeout: 30_000 });
}

test.describe("phase 1 shell guardrails", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, "Set QA_EMAIL/QA_PASSWORD (or E2E_EMAIL/E2E_PASSWORD) for shell regression checks.");
    await login(page);
  });

  test("desktop sidebar is visible, collapses, and header spans viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/platform", { waitUntil: "networkidle" });

    const header = page.getByTestId("topbar");
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(header).toBeVisible();
    await expect(sidebar).toBeVisible();

    const headerBox = await header.boundingBox();
    expect(headerBox?.x ?? 1).toBe(0);
    expect(Math.round(headerBox?.width ?? 0)).toBe(1440);

    const expandedWidth = (await sidebar.boundingBox())?.width ?? 0;
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const collapsedWidth = (await sidebar.boundingBox())?.width ?? 0;

    expect(expandedWidth).toBeGreaterThan(240);
    expect(collapsedWidth).toBeLessThan(100);

    const navScroll = await page.getByTestId("desktop-sidebar").locator("div.h-full.overflow-y-auto").evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(navScroll.scrollHeight).toBeGreaterThan(navScroll.clientHeight);
  });

  test("mobile drawer defaults closed, opens from hamburger, and closes on nav click", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/platform", { waitUntil: "networkidle" });

    const drawer = page.getByTestId("mobile-drawer");
    await expect(drawer).toHaveAttribute("aria-hidden", "true");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(drawer).toHaveAttribute("aria-hidden", "false");

    const firstNav = drawer.getByRole("link", { name: /Overview/i });
    await firstNav.click();
    await expect(drawer).toHaveAttribute("aria-hidden", "true");
  });

  test("captures platform/admin screenshots in light and dark themes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const mode of ["light", "dark"] as const) {
      await page.goto("/platform", { waitUntil: "networkidle" });
      await page.evaluate((theme) => {
        window.localStorage.setItem("gymstack.themeMode", theme);
        document.documentElement.dataset.theme = theme;
      }, mode);
      await page.reload({ waitUntil: "networkidle" });
      const platformShot = await page.screenshot({ fullPage: true });
      expect(platformShot.byteLength).toBeGreaterThan(20_000);

      await page.goto("/admin", { waitUntil: "networkidle" });
      const adminShot = await page.screenshot({ fullPage: true });
      expect(adminShot.byteLength).toBeGreaterThan(20_000);
    }
  });
});
