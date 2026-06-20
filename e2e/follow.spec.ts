import { test, expect } from "@playwright/test";

/** Public profile follow flow — optimistic follow/unfollow with server-truth reconciliation. */

test("following a creator toggles state", async ({ page }) => {
  await page.goto("/u/tunde.flow");

  const follow = page.getByRole("button", { name: /^follow$/i });
  await expect(follow).toBeVisible();
  await expect(follow).toHaveAttribute("aria-pressed", "false");

  await follow.click();
  const following = page.getByRole("button", { name: /^following$/i });
  await expect(following).toBeVisible();
  await expect(following).toHaveAttribute("aria-pressed", "true");

  // Unfollow returns to the initial state.
  await following.click();
  await expect(page.getByRole("button", { name: /^follow$/i })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
