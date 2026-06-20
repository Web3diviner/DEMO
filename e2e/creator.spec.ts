import { test, expect } from "@playwright/test";

/**
 * Creator surfaces smoke (Pixel 7 profile): upload picker, Talent Hub, and verification onboarding
 * render against the mock. Actual byte upload to storage is covered by integration tests, not e2e.
 */

test("upload page shows the picker and data-aware copy", async ({ page }) => {
  await page.goto("/upload");
  await expect(page.getByRole("heading", { name: /new clip/i })).toBeVisible();
  await expect(page.getByText(/choose a video/i)).toBeVisible();
  // Resumability promise is surfaced to the user.
  await expect(page.getByText(/resume/i)).toBeVisible();
});

test("talent hub renders profile, talent score, achievements and clip grid", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/followers/i)).toBeVisible();

  // Talent Score (transparent composite) with sub-scores and an achievement badge.
  await expect(page.getByText(/talent score/i)).toBeVisible();
  await expect(page.getByText(/^Growth$/)).toBeVisible();
  await expect(page.getByText(/rising star/i)).toBeVisible();

  await expect(page.getByRole("heading", { name: /^clips$/i })).toBeVisible();
});

test("verification page states the $1 price and badge-after-confirmation rule", async ({
  page,
}) => {
  await page.goto("/creator/register");
  await expect(page.getByRole("heading", { name: /verified creator/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /verify for \$1/i })).toBeVisible();
  await expect(page.getByText(/badge appears once payment is confirmed/i)).toBeVisible();
});

test("paying $1 verifies the creator only after the mint confirms", async ({ page }) => {
  await page.goto("/creator/register");
  await page.getByRole("button", { name: /verify for \$1/i }).click();

  // Server-truth: a pending/minting state, never an optimistic badge.
  await expect(page.getByText(/confirming your payment|minting your badge/i)).toBeVisible();

  // The badge appears only once the mint is confirmed.
  await expect(page.getByText(/you're verified/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("link", { name: /go to your hub/i })).toBeVisible();
});
