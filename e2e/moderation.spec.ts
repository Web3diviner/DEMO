import { test, expect } from "@playwright/test";

/**
 * Moderation console (PRD §10.3): the review queue loads and an action resolves an item (it leaves
 * the queue optimistically). Runs against the mock on a Pixel 7 profile.
 */

test("a moderator can resolve a queue item", async ({ page }) => {
  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible();

  // First flagged item: possible nudity (AI).
  const firstReason = page.getByText(/possible nudity/i);
  await expect(firstReason).toBeVisible();

  // Remove it; the card leaves the queue.
  await page
    .getByRole("button", { name: /^Remove$/ })
    .first()
    .click();
  await expect(firstReason).toHaveCount(0);
});
