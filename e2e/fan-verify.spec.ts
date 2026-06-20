import { test, expect } from "@playwright/test";

/** Verified-fan tier (PRD §8.4): a <$1 badge that doubles voting weight. */

test("a fan can pay to become verified and gain 2x voting weight", async ({ page }) => {
  // An unverified fan sees the upsell on a live battle, not a verified-vote indicator.
  await page.goto("/battles/battle_live");
  await expect(page.getByRole("link", { name: /verify to 2/i })).toBeVisible();

  // Go through the verified-fan purchase.
  await page.goto("/fan/verify");
  await expect(page.getByRole("heading", { name: /become a verified fan/i })).toBeVisible();
  await page.getByRole("button", { name: /get verified/i }).click();
  await expect(page.getByText(/confirming your payment|minting your badge/i)).toBeVisible();
  await expect(page.getByText(/you're a verified fan/i)).toBeVisible({ timeout: 15000 });
});

test("settings exposes the verified-fan upsell", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("link", { name: /become a verified fan/i })).toBeVisible();
});
