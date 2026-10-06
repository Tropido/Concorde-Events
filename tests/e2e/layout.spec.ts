import { expect, test } from "@playwright/test";
import { enabled } from "./helpers";

test.skip(!enabled, "needs .env.local + .env.test.local for the TEST Supabase project");

for (const lang of ["fr", "ar"] as const) {
  test.describe(`${lang} layout`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{ name: "ce_lang", value: lang, url: baseURL! }]);
    });

    for (const path of ["/", "/catalogue", "/contact", "/about", "/login", "/register"]) {
      test(`${path} renders with the right direction and no horizontal overflow`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  });
}

test("unknown product slugs are a real 404", async ({ page }) => {
  const res = await page.goto("/catalogue/definitely-not-a-product");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

test("booking dialog is keyboard operable", async ({ page }) => {
  await page.goto("/catalogue");
  const book = page.getByRole("button", { name: /choisir dates/i }).first();
  await book.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(book).toBeFocused();
});
