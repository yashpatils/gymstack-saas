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

test.describe("shell smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, "Set QA_EMAIL/QA_PASSWORD (or E2E_EMAIL/E2E_PASSWORD) for shell smoke checks.");
    await login(page);
  });

  test("mobile drawer closes after navigation and account menu remains in viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/platform", { waitUntil: "networkidle" });

    await page.getByTestId("hamburger").click();
    const drawer = page.getByTestId("mobile-drawer");
    await expect(drawer).toHaveAttribute("aria-hidden", "false");

    await drawer.getByRole("link", { name: "Gyms" }).click();
    await page.waitForURL(/\/platform\/gyms/);
    await expect(drawer).toHaveAttribute("aria-hidden", "true");

    await page.getByRole("button", { name: "Open account menu" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) >= 0).toBeTruthy();
    expect((box?.y ?? 0) >= 0).toBeTruthy();
    expect((box?.x ?? 0) + (box?.width ?? 0) <= 390).toBeTruthy();
    expect((box?.y ?? 0) + (box?.height ?? 0) <= 844).toBeTruthy();
  });
});
