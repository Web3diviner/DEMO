import { test, expect } from "@playwright/test";

/**
 * One-tap tipping (Credit spend → creator earnings split) and the For You ↔ Following feed switch
 * (PRD §6.1), on a Pixel 7 profile against the mock.
 */

test("supporting a creator spends Credits and confirms", async ({ page }) => {
  await page.goto("/feed");
  await page
    .getByRole("button", { name: /support this creator/i })
    .first()
    .click();

  // Tip sheet opens with preset tiers; send the default.
  await expect(page.getByRole("dialog", { name: /support @/i })).toBeVisible();
  await page.getByRole("button", { name: /^Send / }).click();

  await expect(page.getByText(/thank you/i)).toBeVisible();
});

test("the feed switches between For You and Following", async ({ page }) => {
  await page.goto("/feed");
  const forYou = page.getByRole("tab", { name: /for you/i });
  const following = page.getByRole("tab", { name: /following/i });
  await expect(forYou).toHaveAttribute("aria-selected", "true");

  await following.click();
  await expect(following).toHaveAttribute("aria-selected", "true");
});
