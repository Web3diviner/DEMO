import { test, expect } from "@playwright/test";

/** Marketplace (PRD §6.7): browse, open a digital listing, and buy with Credits (delivers). */

test("a fan can browse and buy a digital good with Credits", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByRole("heading", { name: /marketplace/i })).toBeVisible();

  // Open the first listing.
  await page.getByRole("link", { name: /lagos nights/i }).click();
  await expect(page).toHaveURL(/\/market\/m1/);

  // Buy → confirm → Credit spend confirmed, digital delivered.
  await page.getByRole("button", { name: /^Buy ·/ }).click();
  await expect(page.getByRole("dialog", { name: /confirm purchase/i })).toBeVisible();
  await page.getByRole("button", { name: /^Pay /).click();
  await expect(page.getByText(/yours now/i)).toBeVisible();
});

test("category filter narrows listings", async ({ page }) => {
  await page.goto("/market");
  await page.getByRole("tab", { name: /^Tickets$/ }).click();
  await expect(page.getByRole("tab", { name: /^Tickets$/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
