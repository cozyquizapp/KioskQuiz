// Basic E2E smoke tests for all main routes
// Run with: npx playwright test

import { test, expect } from '@playwright/test';

test.describe('Route smoke tests', () => {
  test('Landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CozyQuiz|Quiz/i);
  });

  test('Team page loads', async ({ page }) => {
    await page.goto('/team');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Menu page loads', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.locator('body')).toBeVisible();
  });

  test('QQ Builder page loads', async ({ page }) => {
    await page.goto('/qq-builder');
    await expect(page.locator('body')).toBeVisible();
  });

  test('QQ Library page loads', async ({ page }) => {
    await page.goto('/qq-library');
    await expect(page.locator('body')).toBeVisible();
    // Should show the library header
    await expect(page.getByText('Fragebibliothek')).toBeVisible();
  });

  test('QQ Team page loads', async ({ page }) => {
    await page.goto('/quarterquiz-team');
    await expect(page.locator('body')).toBeVisible();
  });

  test('QQ Moderator page loads', async ({ page }) => {
    await page.goto('/quarterquiz-moderator');
    await expect(page.locator('body')).toBeVisible();
  });

  test('QQ Beamer page loads', async ({ page }) => {
    await page.goto('/quarterquiz-beamer');
    await expect(page.locator('body')).toBeVisible();
  });
});
