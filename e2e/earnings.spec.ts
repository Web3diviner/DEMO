import { test, expect } from "@playwright/test";

/** Creator earnings & withdrawal — real money, server-truth balances, kept separate from Credits. */

test("a creator can withdraw available earnings", async ({ page }) => {
  await page.goto("/earnings");
  await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();

  // Balances and ledger render.
  await expect(page.getByText(/available to withdraw/i)).toBeVisible();
  await expect(page.getByText(/battle prize/i)).toBeVisible();

  // Withdraw the full balance.
  await page.getByRole("button", { name: /^withdraw$/i }).click();
  const dialog = page.getByRole("dialog", { name: /withdraw earnings/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^withdraw ₦/i }).click();

  // Server-confirmed success, and a pending withdrawal lands in the ledger.
  await expect(page.getByText(/on its way/i)).toBeVisible();
  await page.getByRole("button", { name: /^done$/i }).click();
  await expect(page.getByText(/withdrawal to gtbank/i)).toBeVisible();
});

test("the wallet links through to earnings", async ({ page }) => {
  await page.goto("/credits");
  await page.getByRole("link", { name: /manage earnings/i }).click();
  await expect(page).toHaveURL(/\/earnings/);
  await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();
});
