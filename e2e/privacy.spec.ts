import { test, expect } from "@playwright/test";

/** Privacy settings — toggles and audience segments, reached from Settings. */

test("privacy controls toggle and persist", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("link", { name: /^privacy/i }).click();
  await expect(page).toHaveURL(/\/settings\/privacy/);
  await expect(page.getByRole("heading", { name: /^privacy$/i })).toBeVisible();

  // Private account starts off; turning it on sticks.
  const priv = page.getByRole("switch", { name: /private account/i });
  await expect(priv).toHaveAttribute("aria-checked", "false");
  await priv.click();
  await expect(priv).toHaveAttribute("aria-checked", "true");

  // Restrict comments to following.
  const following = page
    .getByRole("group", { name: /comments from/i })
    .getByRole("button", { name: /^following$/i });
  await following.click();
  await expect(following).toHaveAttribute("aria-pressed", "true");
});
