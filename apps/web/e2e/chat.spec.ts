import { test, expect } from '@playwright/test'

test.describe('Chat', () => {
  test('chat page renders', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.locator('body')).toBeVisible()
  })
})
