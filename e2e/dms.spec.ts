import { test, expect } from "@playwright/test";

/** Basic DMs (PRD §11): open a thread and send a message (optimistic), on a Pixel 7 profile. */

test("a user can open a thread and send a message", async ({ page }) => {
  await page.goto("/dms");
  await expect(page.getByRole("heading", { name: /^messages$/i })).toBeVisible();

  // Open the first conversation.
  await page.getByRole("link", { name: /ada\.beats/i }).click();
  await expect(page).toHaveURL(/\/dms\/dm_ada/);

  const input = page.getByPlaceholder(/^message…$/i);
  await input.fill("Let's collab! 🎶");
  await page.getByRole("button", { name: /send message/i }).click();

  // Optimistic: appears immediately in the thread.
  await expect(page.getByText("Let's collab! 🎶")).toBeVisible();
});
