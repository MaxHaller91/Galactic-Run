import { test, expect } from "@playwright/test";
test("boot w/o console errors", async ({ page }) => {
  const logs = [];
  page.on("console", m => logs.push([m.type(), m.text()]));
  await page.goto("/index.html");
  await expect(page.locator("#gameContainer")).toBeVisible();
  await page.waitForTimeout(1000);
  expect(logs.filter(l => l[0] === "error")).toHaveLength(0);
});
