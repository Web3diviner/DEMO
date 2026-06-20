import { test, expect } from "@playwright/test";

/** Blocked accounts — view the block list and unblock, reached from Privacy. */

test("a user can review and unblock accounts", async ({ page }) => {
  await page.goto("/settings/privacy");
  await page.getByRole("link", { name: /blocked accounts/i }).click();
  await expect(page).toHaveURL(/\/settings\/privacy\/blocked/);
  await expect(page.getByRole("heading", { name: /blocked accounts/i })).toBeVisible();

  // A seeded blocked account is listed; unblocking removes it.
  const row = page.getByRole("listitem").filter({ hasText: /dealsdailyng/i });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /unblock/i }).click();
  await expect(page.getByText(/dealsdailyng/i)).toHaveCount(0);
});
