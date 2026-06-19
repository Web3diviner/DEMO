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

test("talent hub renders profile, stats and clip grid", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/followers/i)).toBeVisible();
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
