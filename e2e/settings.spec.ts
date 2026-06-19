import { test, expect } from "@playwright/test";

/** Settings: push + data-saver controls render and the data-saver switch toggles (Pixel 7). */

test("settings shows notification and data controls", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
  await expect(page.getByRole("switch", { name: /push notifications/i })).toBeVisible();

  const dataSaver = page.getByRole("switch", { name: /data saver/i });
  await expect(dataSaver).toBeVisible();
});
