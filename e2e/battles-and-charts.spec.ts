import { test, expect } from "@playwright/test";

/**
 * Battles (the "battle vote" leg of top-up → spend → battle vote) and Charts, on a Pixel 7 profile
 * against the mock. Voting spends Credits server-side; the mock returns the updated tally + wallet.
 */

test("a fan can open a live battle and cast a Credit-funded vote", async ({ page }) => {
  await page.goto("/battles");
  await expect(page.getByRole("heading", { name: /^battles$/i })).toBeVisible();

  // Open the live battle.
  await page.getByRole("link", { name: /freshers' rap clash/i }).click();
  await expect(page).toHaveURL(/\/battles\/battle_live/);

  // Verified-weight affordance is shown.
  await expect(page.getByText(/your verified vote counts/i)).toBeVisible();

  // Vote for the first contestant.
  await page
    .getByRole("button", { name: /^Vote$/ })
    .first()
    .click();

  // Server-confirmed: vote recorded, button flips to Backed.
  await expect(page.getByText(/vote counted/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /backed/i })).toBeVisible();
});

test("charts switch between Campus and Rising Stars", async ({ page }) => {
  await page.goto("/charts");
  await expect(page.getByRole("heading", { name: /^charts$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /campus/i })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: /rising stars/i }).click();
  await expect(page.getByText(/growth velocity/i)).toBeVisible();
});
