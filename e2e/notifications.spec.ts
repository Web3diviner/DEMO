import { test, expect } from "@playwright/test";

/** Activity inbox — the in-app companion to web-push. Lists events and clears unread state. */

test("the activity inbox lists events and marks all read", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: /^activity/i })).toBeVisible();

  // A seeded event is shown, grouped under a time bucket.
  await expect(page.getByText(/sent you 50 credits/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^today$/i })).toBeVisible();

  // Clearing unread disables the control.
  const markRead = page.getByRole("button", { name: /mark all read/i });
  await expect(markRead).toBeEnabled();
  await markRead.click();
  await expect(markRead).toBeDisabled();
});

test("filters narrow the inbox and a tapped item clears its unread state", async ({ page }) => {
  await page.goto("/notifications");

  // Earnings filter shows money events, hides social ones.
  await page.getByRole("tab", { name: /^earnings/i }).click();
  await expect(page.getByText(/ready to withdraw/i)).toBeVisible();
  await expect(page.getByText(/started following you/i)).toHaveCount(0);

  // Unread filter, then opening an item marks just that one read (it leaves the unread set).
  await page.getByRole("tab", { name: /^unread/i }).click();
  const follow = page.getByText(/started following you/i);
  await expect(follow).toBeVisible();
  await follow.click();
  await expect(page).toHaveURL(/\/u\/zainab\.sings/);

  await page.goBack();
  await page.getByRole("tab", { name: /^unread/i }).click();
  await expect(page.getByText(/started following you/i)).toHaveCount(0);
});

test("the feed exposes a notifications entry point", async ({ page }) => {
  await page.goto("/feed");
  const bell = page.getByRole("link", { name: /^activity/i });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page).toHaveURL(/\/notifications/);
});
