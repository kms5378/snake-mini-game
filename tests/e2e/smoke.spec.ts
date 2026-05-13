import { expect, test } from "@playwright/test";

test("renders the game board and leaderboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Snake Mini Game" })).toBeVisible();
  await expect(page.getByRole("application", { name: "Snake board" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();

  const canvasBox = await page.getByLabel("Snake canvas").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(250);
  expect(canvasBox?.height).toBeGreaterThan(250);
});
