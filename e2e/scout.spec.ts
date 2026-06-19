import { test, expect } from "@playwright/test";

/**
 * Talent Intelligence (PRD §6.9): the scout dashboard lists talents with explainable scores,
 * filters them, and opens a breakdown. Runs against the mock on a Pixel 7 profile.
 */

test("scout can filter talent and open an explainable breakdown", async ({ page }) => {
  await page.goto("/scout");
  await expect(page.getByRole("heading", { name: /talent intelligence/i })).toBeVisible();

  // Results render with composite scores.
  const firstCard = page.getByRole("button", { name: /overall/i }).first();
  await expect(firstCard).toBeVisible();

  // Filter by genre narrows results.
  await page.getByLabel(/genre/i).selectOption("Gospel");
  await expect(page.getByText(/result/i)).toBeVisible();

  // Open a breakdown sheet.
  await page
    .getByRole("button", { name: /overall/i })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/why this score/i)).toBeVisible();
});
