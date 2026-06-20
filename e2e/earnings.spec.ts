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

test("a creator can convert earnings into spendable Credits", async ({ page }) => {
  await page.goto("/earnings");

  await page.getByRole("button", { name: /to credits/i }).click();
  const dialog = page.getByRole("dialog", { name: /convert to credits/i });
  await expect(dialog).toBeVisible();

  // The preview quotes whole Credits, and the confirm button names the amount.
  const confirm = dialog.getByRole("button", { name: /^convert to [\d,]+ credits$/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Server-confirmed success, and a settled conversion lands in the ledger.
  await expect(page.getByText(/\+[\d,]+ credits/i)).toBeVisible();
  await page.getByRole("button", { name: /^done$/i }).click();
  await expect(page.getByText(/converted to [\d,]+ credits/i)).toBeVisible();
});

test("a creator can change the payout account after confirming the name", async ({ page }) => {
  await page.goto("/earnings");

  await page.getByRole("button", { name: /^change$/i }).click();
  const dialog = page.getByRole("dialog", { name: /payout account/i });
  await expect(dialog).toBeVisible();

  // Save stays disabled until the account resolves.
  const save = dialog.getByRole("button", { name: /save payout account/i });
  await expect(save).toBeDisabled();

  await dialog.getByRole("combobox").selectOption({ label: "Access Bank" });
  await dialog.getByPlaceholder("0123456789").fill("0123456789");

  // The resolved holder name appears, enabling save.
  await expect(dialog.getByText(/[A-Z]{3,} [A-Z]{3,}/)).toBeVisible();
  await expect(save).toBeEnabled();
  await save.click();

  // The new account (last 4 digits) is reflected on the screen.
  await expect(page.getByText(/Access Bank ••••6789/)).toBeVisible();
});

test("the wallet links through to earnings", async ({ page }) => {
  await page.goto("/credits");
  await page.getByRole("link", { name: /manage earnings/i }).click();
  await expect(page).toHaveURL(/\/earnings/);
  await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible();
});
