import { test, expect } from "@playwright/test";

/** Ambassador dashboard (PRD §6.10): referral code, verified-activity framing, leaderboard. */

test("ambassador dashboard shows the referral code and reward framing", async ({ page }) => {
  await page.goto("/ambassador");
  await expect(page.getByRole("heading", { name: /campus ambassador/i })).toBeVisible();
  await expect(page.getByText("ADA-UNILAG")).toBeVisible();
  // Reward is tied to verified activity, not raw sign-ups.
  await expect(page.getByText(/verified & active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();
  await expect(page.getByText(/campus leaderboard/i)).toBeVisible();
});
