import { test, expect } from "@playwright/test";

/** Events (PRD §6.8): browse, get a ticket (Credit-funded), and it lands in the pass wallet. */

test("a fan can get a ticket and see it in My tickets", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: /^events$/i })).toBeVisible();

  await page.getByRole("link", { name: /freshers' night live/i }).click();
  await expect(page).toHaveURL(/\/events\/ev1/);

  await page.getByRole("button", { name: /get ticket ·/i }).click();
  await expect(page.getByRole("dialog", { name: /get ticket/i })).toBeVisible();
  await page.getByRole("button", { name: /^Pay / }).click();

  // Ticket issued with a QR.
  await expect(page.getByRole("img", { name: /ticket qr/i })).toBeVisible();

  // And it shows in the ticket wallet.
  await page.goto("/tickets");
  await expect(page.getByText(/freshers' night live/i)).toBeVisible();
});

test("event type filter works", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("tab", { name: /^Concerts$/ }).click();
  await expect(page.getByRole("tab", { name: /^Concerts$/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
