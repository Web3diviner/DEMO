import { test, expect } from "@playwright/test";

/**
 * Treasury & Risk console (staff-only): the money ledger + fraud signals load, and resolving a
 * signal drops it from the open list optimistically. Runs against the mock on a Pixel 7 profile.
 */

test("the staff nav links moderation to treasury", async ({ page }) => {
  await page.goto("/moderation");
  await page.getByRole("link", { name: /treasury & risk/i }).click();
  await expect(page).toHaveURL(/\/treasury/);
  await expect(page.getByRole("heading", { name: /treasury & risk/i })).toBeVisible();
});

test("treasury shows roll-up totals, ledger entries and resolvable risk signals", async ({
  page,
}) => {
  await page.goto("/treasury");

  // Money roll-up + a couple of ledger lines render.
  await expect(page.getByText(/gross volume/i)).toBeVisible();
  await expect(page.getByText(/platform revenue/i)).toBeVisible();
  await expect(page.getByText(/credit pack — 550 credits/i)).toBeVisible();

  // A high-severity velocity signal is present; freezing funds resolves it out of the list.
  const signal = page.getByText(/8 top-ups totalling/i);
  await expect(signal).toBeVisible();
  await page
    .getByRole("button", { name: /freeze funds/i })
    .first()
    .click();
  await expect(signal).toHaveCount(0);
});
