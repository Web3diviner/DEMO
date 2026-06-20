import { test, expect } from "@playwright/test";

/** Creator content management — list uploads, edit a caption, delete a clip. */

test("a creator can edit a caption and delete a clip", async ({ page }) => {
  await page.goto("/content");
  await expect(page.getByRole("heading", { name: /your content/i })).toBeVisible();
  await expect(page.getByText(/freestyle friday/i)).toBeVisible();
  await expect(page.getByText(/^Processing…$/)).toBeVisible();

  // Edit the first clip's caption.
  await page
    .getByRole("listitem")
    .filter({ hasText: /freestyle friday/i })
    .getByRole("button", { name: /edit/i })
    .click();
  const editSheet = page.getByRole("dialog", { name: /edit caption/i });
  await expect(editSheet).toBeVisible();
  await editSheet.getByRole("textbox").fill("Freestyle Friday — encore 🎤");
  await editSheet.getByRole("button", { name: /save caption/i }).click();
  // Wait for the sheet to close so the textarea (same text) no longer matches, then assert the row.
  await expect(editSheet).toBeHidden();
  await expect(page.getByText(/freestyle friday — encore/i)).toBeVisible();

  // Delete a clip with confirmation.
  await page
    .getByRole("listitem")
    .filter({ hasText: /dorm session/i })
    .getByRole("button", { name: /delete/i })
    .click();
  const del = page.getByRole("dialog", { name: /delete clip/i });
  await expect(del).toBeVisible();
  await del.getByRole("button", { name: /^delete$/i }).click();
  await expect(page.getByText(/dorm session/i)).toHaveCount(0);
});

test("the hub links to your content", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /your content/i }).click();
  await expect(page).toHaveURL(/\/content/);
  await expect(page.getByRole("heading", { name: /your content/i })).toBeVisible();
});
