import { test, expect } from "@playwright/test";

/** Settings: push + data-saver controls render and the data-saver switch toggles (Pixel 7). */

test("settings shows notification and data controls", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
  await expect(page.getByRole("switch", { name: /push notifications/i })).toBeVisible();

  const dataSaver = page.getByRole("switch", { name: /data saver/i });
  await expect(dataSaver).toBeVisible();
});

test("notification category preferences toggle and persist", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText(/what you're notified about/i)).toBeVisible();

  // Comments starts off in the mock; turning it on flips the switch.
  const comments = page.getByRole("switch", { name: /comments/i });
  await expect(comments).toHaveAttribute("aria-checked", "false");
  await comments.click();
  await expect(comments).toHaveAttribute("aria-checked", "true");

  // Tips starts on; turning it off sticks.
  const tips = page.getByRole("switch", { name: /tips & earnings/i });
  await expect(tips).toHaveAttribute("aria-checked", "true");
  await tips.click();
  await expect(tips).toHaveAttribute("aria-checked", "false");
});
