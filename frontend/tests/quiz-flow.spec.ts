// End-to-End Test: Quiz Lobby, Team Join, Start Quiz, Answer, Evaluation
// Run with: npx playwright test frontend/tests/quiz-flow.spec.ts

import { test, expect } from '@playwright/test';

const LOBBY_URL = process.env.LOBBY_URL || 'http://localhost:5173/lobby';
const TEAM_URL = process.env.TEAM_URL || 'http://localhost:5173/team';

// Simulate quiz flow: lobby → team join → start → answer → evaluation

test.describe('Quiz Flow', () => {
  test('Lobby loads and team can join', async ({ page }) => {
    await page.goto(LOBBY_URL);
    await expect(page.locator('#lobby-root')).toBeVisible();
    await page.fill('input[name="teamName"]', 'TestTeam');
    await page.click('button[type="submit"]');
    await expect(page.locator('#team-root')).toBeVisible();
  });

  test('Quiz can be started and answered', async ({ page }) => {
    await page.goto(TEAM_URL);
    await expect(page.locator('#team-root')).toBeVisible();
    // Wait for question
    await page.waitForSelector('.question-text', { timeout: 5000 });
    // Answer question
    await page.fill('input[name="answer"]', '42');
    await page.click('button[type="submit"]');
    // Wait for evaluation/result
    await page.waitForSelector('.evaluation-result', { timeout: 5000 });
    await expect(page.locator('.evaluation-result')).toBeVisible();
  });
});
