import { test, expect } from "@playwright/test";

/** Creator Studio — performance dashboard with range switching, trend chart, top clips, audience. */

test("the studio shows metrics and switches range", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: /^studio$/i })).toBeVisible();

  // Headline metrics + a trend chart render.
  await expect(page.getByText(/^views$/i).first()).toBeVisible();
  await expect(page.getByText(/new followers/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /daily views over the period/i })).toBeVisible();

  // Top clips and audience sections.
  await expect(page.getByRole("heading", { name: /top clips/i })).toBeVisible();
  await expect(page.getByText(/freestyle friday/i)).toBeVisible();
  await expect(page.getByText(/^UNILAG$/)).toBeVisible();

  // Switching range keeps the dashboard and updates the selected tab.
  const tab = page.getByRole("tab", { name: /90 days/i });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("img", { name: /daily views over the period/i })).toBeVisible();
});

test("the hub links to the studio", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /studio/i }).click();
  await expect(page).toHaveURL(/\/analytics/);
  await expect(page.getByRole("heading", { name: /^studio$/i })).toBeVisible();
});
