import { test, expect } from "@playwright/test";

/** Profile editing — change display name, bio, campus; reflected on the Talent Hub. */

test("editing the profile updates the hub", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /edit profile/i }).click();
  await expect(page).toHaveURL(/\/profile\/edit/);
  await expect(page.getByRole("heading", { name: /edit profile/i })).toBeVisible();

  // Save stays disabled until something changes.
  const save = page.getByRole("button", { name: /save changes/i });
  await expect(save).toBeDisabled();

  // Edit display name + bio + campus.
  const name = page.getByRole("textbox").first();
  await name.fill("Ada B.");
  await page.getByRole("textbox").nth(1).fill("Afrobeats artist · UNILAG 🎶");
  await page.getByRole("combobox").selectOption("OAU");

  await expect(save).toBeEnabled();
  await save.click();

  // Back on the hub, the new values show.
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: /ada b\./i })).toBeVisible();
  await expect(page.getByText(/afrobeats artist/i)).toBeVisible();
  await expect(page.getByText(/^OAU$/)).toBeVisible();
});

test("public profiles don't expose owner-only tools", async ({ page }) => {
  await page.goto("/u/tunde.flow");
  await expect(page.getByRole("link", { name: /edit profile/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /your content/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^follow$/i })).toBeVisible();
});
