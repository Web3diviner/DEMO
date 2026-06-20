import { test, expect } from "@playwright/test";

/**
 * DEMO ID — invisible on-chain ownership (PRD §8.1). The custodial wallet is surfaced as
 * plain-language ownership: an identity anchor plus the credentials, badges and passes a user owns.
 * No seed phrase or gas is ever exposed; chain details stay behind a deliberate disclosure.
 */

test("the profile links through to the DEMO ID", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /your demo id/i }).click();
  await expect(page).toHaveURL(/\/id/);
  await expect(page.getByRole("heading", { name: /^demo id$/i })).toBeVisible();
});

test("the DEMO ID surfaces owned items and keeps chain details hidden by default", async ({
  page,
}) => {
  await page.goto("/id");

  // Identity anchor renders with the human-readable DID and the invisible-wallet reassurance.
  await expect(page.getByText(/did:demo:ada\.beats/i)).toBeVisible();
  await expect(page.getByText(/no seed phrase, no gas/i)).toBeVisible();

  // Owned credentials/badges/passes are listed (titles unique to the item rows).
  await expect(page.getByText(/founding member/i)).toBeVisible();
  await expect(page.getByText(/battle champion/i)).toBeVisible();
  await expect(page.getByText(/event pass · admits one/i)).toBeVisible();

  // Technical references are hidden until explicitly revealed.
  await expect(page.getByText(/VC-SBT/)).toBeHidden();
  await page.getByRole("button", { name: /show technical details/i }).click();
  await expect(page.getByText(/VC-SBT/)).toBeVisible();
  await expect(page.getByText(/0x7a4C…F3c2/)).toBeVisible();
});
