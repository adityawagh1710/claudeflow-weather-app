import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("bootstraps a location from IP and shows current conditions", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weather");

  const hero = page.getByTestId("current-conditions");
  await expect(hero).toBeVisible();
  await expect(page.getByTestId("current-temp")).toHaveText("18°C");
});

test("searching a city shows candidates and loads selected weather", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("current-conditions")).toBeVisible();

  await page.getByTestId("search-input").fill("Paris");

  const listbox = page.getByTestId("search-listbox");
  await expect(listbox).toBeVisible();

  const option = page.getByTestId("search-option").first();
  await expect(option).toContainText("Paris");
  await option.click();

  await expect(page.getByRole("heading", { name: /Paris/ })).toBeVisible();
  await expect(page.getByTestId("current-temp")).toHaveText("25°C");
});

test("unit toggles change rendered values", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("current-temp")).toHaveText("18°C");

  // °C -> °F
  await page.getByTestId("pref-fahrenheit").click();
  await expect(page.getByTestId("current-temp")).toHaveText("64°F");

  // 24h -> 12h: observed time changes representation.
  const observed = page.getByTestId("observed-time");
  await expect(observed).toHaveText("13:05");
  await page.getByTestId("pref-12h").click();
  await expect(observed).toHaveText("1:05 PM");
});
