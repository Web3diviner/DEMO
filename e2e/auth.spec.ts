import { test, expect } from "@playwright/test";

/** Onboarding: phone → OTP → profile (campus) → feed; plus sign-out from Settings. */

test("a new user can sign up with phone, code and campus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/auth/);

  // Phone step.
  await page.getByLabel(/phone number/i).fill("08012345678");
  await page.getByRole("button", { name: /send code/i }).click();

  // OTP step — wrong code is rejected, the demo code works.
  await expect(page.getByRole("heading", { name: /enter your code/i })).toBeVisible();
  await page.getByLabel(/verification code/i).fill("000000");
  await page.getByRole("button", { name: /^verify$/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel(/verification code/i).fill("123456");
  await page.getByRole("button", { name: /^verify$/i }).click();

  // Profile step.
  await expect(page.getByRole("heading", { name: /set up your profile/i })).toBeVisible();
  await page.getByLabel(/display name/i).fill("Ada B");
  await page.getByLabel(/username/i).fill("ada.b");
  await page.getByLabel(/campus/i).selectOption("OAU");
  await page.getByRole("button", { name: /enter skylora/i }).click();

  await expect(page).toHaveURL(/\/feed/);
});

test("settings shows the KYC tier and signs out to the landing", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText(/verification/i)).toBeVisible();
  await expect(page.getByText(/identity verified/i)).toBeVisible(); // demo user is Tier 2

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$|\/$/);
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});
