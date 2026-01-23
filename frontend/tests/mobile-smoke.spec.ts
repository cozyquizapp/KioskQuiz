// Quick mobile smoke test for Team view
// Run with: npx playwright test frontend/tests/mobile-smoke.spec.ts --project="Mobile Safari" --project="Pixel 7"
// Requires Playwright devDependency. If not installed: npx playwright@latest install

import { test, expect, devices } from '@playwright/test';

const TEAM_URL = process.env.TEAM_URL || 'http://localhost:5173/team';

const projects = [
  { name: 'Mobile Safari', device: devices['iPhone 14 Pro'] },
  { name: 'Pixel 7', device: devices['Pixel 7'] }
];

projects.forEach(({ name, device }) => {
  test.describe(name, () => {
    test.use({ ...device });

    test('team page loads without layout shift', async ({ page }) => {
      test.fixme(!TEAM_URL, 'TEAM_URL not provided');
      await page.goto(TEAM_URL, { waitUntil: 'networkidle' });
      await expect(page.locator('#team-root')).toBeVisible();
      // Basic smoke: no horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth - clientWidth).toBeLessThan(8);
    });

    test('primary actions are tappable', async ({ page }) => {
      test.fixme(!TEAM_URL, 'TEAM_URL not provided');
      await page.goto(TEAM_URL, { waitUntil: 'domcontentloaded' });
      const buttons = page.locator('button, [role="button"]');
      await expect(buttons.first()).toBeVisible();
      await buttons.first().click({ trial: true });
    });
  });
});
