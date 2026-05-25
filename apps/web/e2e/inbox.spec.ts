import { test, expect } from '@playwright/test'

test.describe('Inbox & Handoff', () => {
  test('inbox page renders', async ({ page }) => {
    await page.goto('/inbox')
    await expect(page.locator('body')).toBeVisible()
  })
})
