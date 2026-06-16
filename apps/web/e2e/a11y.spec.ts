import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("main page has no detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  // Wait for data-driven content so axe scans the full rendered UI.
  await expect(page.getByTestId("current-conditions")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("exactly one h1 and combobox exposes correct ARIA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  const combobox = page.getByRole("combobox");
  await expect(combobox).toHaveAttribute("aria-expanded", "false");
  await combobox.fill("London");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(combobox).toHaveAttribute("aria-expanded", "true");
});
