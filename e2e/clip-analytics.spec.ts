import { test, expect } from "@playwright/test";

/** Per-clip drill-down: retention curve, engagement, and traffic sources. */

test("a top clip opens its insights with a retention curve", async ({ page }) => {
  await page.goto("/analytics");

  // Open the first top clip.
  await page.getByRole("link", { name: /freestyle friday/i }).click();
  await expect(page).toHaveURL(/\/analytics\/c1/);
  await expect(page.getByRole("heading", { name: /freestyle friday/i })).toBeVisible();

  // Engagement, watch metrics, retention curve, and sources render.
  await expect(page.getByText(/avg\. watched/i)).toBeVisible();
  await expect(page.getByText(/completion/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /audience retention curve/i })).toBeVisible();
  await expect(page.getByText(/where views came from/i)).toBeVisible();
  await expect(page.getByText(/^For You$/)).toBeVisible();
});
