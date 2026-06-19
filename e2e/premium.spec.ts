import { test, expect } from "@playwright/test";

/**
 * Fan Clubs / premium (PRD §6.6): a fan subscribes to a tier (recurring Paystack, pending→active),
 * unlocking members-only content. Runs against the mock on a Pixel 7 profile.
 */

test("subscribing unlocks members-only content", async ({ page }) => {
  await page.goto("/fanclub/ada.beats");
  await expect(page.getByRole("heading", { name: /fan club/i })).toBeVisible();

  // Locked before joining.
  await expect(page.getByText(/^Locked$/).first()).toBeVisible();

  // Join the Supporter tier.
  await page
    .getByRole("button", { name: /^Join · / })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: /join/i })).toBeVisible();
  await page.getByRole("button", { name: /^Subscribe$/ }).click();

  // Pending → active (webhook-confirmed).
  await expect(page.getByText(/confirming your membership/i)).toBeVisible();
  await expect(page.getByText(/you're in/i)).toBeVisible({ timeout: 15_000 });
});

test("memberships screen lists subscriptions", async ({ page }) => {
  await page.goto("/memberships");
  await expect(page.getByRole("heading", { name: /memberships/i })).toBeVisible();
});
