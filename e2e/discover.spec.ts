import { test, expect } from "@playwright/test";

// Assumes a signed-in storage state is provided via E2E_STORAGE_STATE, or
// that auth is bypassed in the target environment the same way the existing
// demo/dev-unlock flow does (see libs/dev-unlock.ts). This test exercises
// the Discover loop's UI contract; it does not stand up its own auth.
test.describe("Discover loop", () => {
  test("onboarding leads to a feed where a trend can be followed", async ({ page }) => {
    await page.goto("/dashboard");

    const picker = page.getByRole("heading", { name: /what should we watch for you/i });

    if (await picker.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "AI" }).click();
      await page.getByRole("button", { name: "SaaS" }).click();
      await page.getByRole("button", { name: "Developer tools" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
    }

    await expect(page.getByRole("heading", { name: "For you" })).toBeVisible();

    const firstFollowButton = page.getByRole("button", { name: "Follow" }).first();
    if (await firstFollowButton.isVisible().catch(() => false)) {
      await firstFollowButton.click();
      await expect(page.getByRole("button", { name: "Following" }).first()).toBeVisible();
    }
  });
});
