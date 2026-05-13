import { expect, test } from "@playwright/test";

test("renders the game board and leaderboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Snake Mini Game" })).toBeVisible();
  await expect(page.getByRole("application", { name: "Snake board" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start game from board" })).toBeVisible();

  const canvasBox = await page.getByLabel("Snake canvas").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(250);
  expect(canvasBox?.height).toBeGreaterThan(250);
});

test("starts from the board overlay button", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start game from board" }).click();

  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start game from board" })).toHaveCount(0);
});
