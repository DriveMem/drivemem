import { test, expect } from '@playwright/test'

test.describe('Knowledge', () => {
  test('files page renders', async ({ page }) => {
    await page.goto('/files')
    await expect(page.locator('body')).toBeVisible()
  })

  test('search page renders', async ({ page }) => {
    await page.goto('/search?q=test')
    await expect(page.locator('body')).toBeVisible()
  })
})
