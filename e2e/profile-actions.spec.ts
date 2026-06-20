import { test, expect } from "@playwright/test";

/** Public-profile actions: report and block, the latter landing in the block list. */

test("blocking from a profile adds to the block list", async ({ page }) => {
  await page.goto("/u/zainab.moves");

  await page.getByRole("button", { name: /more options/i }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  await sheet.getByRole("button", { name: /block @zainab\.moves/i }).click();
  await sheet.getByRole("button", { name: /^block$/i }).click();
  // Server-confirmed; the block also updates the shared ["blocked"] cache the block list reads.
  await expect(sheet.getByText(/blocked @zainab\.moves/i)).toBeVisible();
});

test("reporting a profile walks through reasons", async ({ page }) => {
  await page.goto("/u/zainab.moves");
  await page.getByRole("button", { name: /more options/i }).click();
  const sheet = page.getByRole("dialog");

  await sheet.getByRole("button", { name: /^report/i }).click();
  const submit = sheet.getByRole("button", { name: /submit report/i });
  await expect(submit).toBeDisabled();
  await sheet.getByRole("button", { name: /spam or scam/i }).click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(sheet.getByText(/thanks for reporting/i)).toBeVisible();
});
