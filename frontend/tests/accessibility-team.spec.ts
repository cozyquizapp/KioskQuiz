// Accessibility smoke test for Team view using axe-core
// Run with: npx playwright test frontend/tests/accessibility-team.spec.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TEAM_URL = process.env.TEAM_URL || 'http://localhost:5173/team';

test.describe('Accessibility: Team View', () => {
  test('should have no critical accessibility violations', async ({ page }) => {
    await page.goto(TEAM_URL);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical.length).toBe(0);
  });
});
