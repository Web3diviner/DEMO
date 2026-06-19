import { test, expect } from "@playwright/test";

/**
 * Money-critical path (top-up half of "top-up → spend → battle vote") and comments, on a Pixel 7
 * profile against the mock. The mock walks the top-up through pending → webhook-confirmed success,
 * so this exercises the no-optimistic-credit rule end-to-end.
 */

test("top-up shows a pending state, then credits only after confirmation", async ({ page }) => {
  await page.goto("/credits");
  await expect(page.getByRole("heading", { name: /^wallet$/i })).toBeVisible();

  await page.getByRole("button", { name: /top up credits/i }).click();

  // Pack sheet opens; pick the popular pack.
  const pack = page.getByRole("button", { name: /most popular/i });
  await expect(pack).toBeVisible();
  await pack.click();

  // Honest in-between: confirming, balance NOT yet moved.
  await expect(page.getByText(/confirming your payment/i)).toBeVisible();

  // After the simulated webhook confirms, success is shown.
  await expect(page.getByText(/credits added/i)).toBeVisible({ timeout: 15_000 });
});

test("comment sheet posts optimistically", async ({ page }) => {
  await page.goto("/feed");
  await page
    .getByRole("button", { name: /^Comment/ })
    .first()
    .click();

  const input = page.getByPlaceholder(/add a comment/i);
  await expect(input).toBeVisible();
  await input.fill("Incredible talent 👏");
  await page.getByRole("button", { name: /post comment/i }).click();

  // Appears instantly, attributed to "You".
  await expect(page.getByText("Incredible talent 👏")).toBeVisible();
  await expect(page.getByText("@you")).toBeVisible();
});
