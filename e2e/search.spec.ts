import { test, expect } from "@playwright/test";

/** Search & hashtags (PRD §6.1): trends on empty, live results, on a Pixel 7 profile. */

test("search shows trends, then results for a query", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByText(/trending now/i)).toBeVisible();

  await page.getByRole("searchbox", { name: /search/i }).fill("ada");
  // Creator result appears (debounced).
  await expect(page.getByRole("link", { name: /ada\.beats/i })).toBeVisible();
});

test("tapping a trending hashtag searches it", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: /#afrobeats/i }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("#afrobeats");
});
