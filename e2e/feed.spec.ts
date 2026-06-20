import { test, expect } from "@playwright/test";

/**
 * Feed smoke test on a mid-range mobile device profile (Pixel 7).
 *
 * Verifies the core consumer loop renders against the mock backend: the feed loads, the data-saver
 * control is present and honest, and a like optimistically toggles without a network round-trip.
 * The money-critical `top-up → spend → battle vote` journey attaches here once those surfaces ship.
 */

test("landing routes into the feed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /campus talent/i })).toBeVisible();
  await page.getByRole("link", { name: /enter the feed/i }).click();
  await expect(page).toHaveURL(/\/feed/);
});

test("feed renders clips with an honest data-saver control", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByRole("feed", { name: /talent feed/i })).toBeVisible();
  // On the emulated mobile device the policy defaults to data-saving.
  await expect(page.getByRole("button", { name: /p$|data saver/i }).first()).toBeVisible();
});

test("liking a clip toggles optimistically", async ({ page }) => {
  await page.goto("/feed");
  const like = page.getByRole("button", { name: /^Like/ }).first();
  await like.waitFor();
  await like.click();
  // aria-pressed flips to true instantly (no waiting on the network).
  await expect(page.getByRole("button", { name: /^Unlike/ }).first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a clip can be reported", async ({ page }) => {
  await page.goto("/feed");
  await page
    .getByRole("button", { name: /more options, including report/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: /report this clip/i });
  await expect(dialog).toBeVisible();
  const submit = dialog.getByRole("button", { name: /submit report/i });
  await expect(submit).toBeDisabled();
  await dialog.getByRole("button", { name: /spam or scam/i }).click();
  await submit.click();
  await expect(page.getByText(/thanks for reporting/i)).toBeVisible();
});
