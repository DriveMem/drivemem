import { test, expect } from '@playwright/test'

test.describe('Workspace', () => {
  test('workspace page renders', async ({ page }) => {
    await page.goto('/workspace/members')
    await expect(page.locator('body')).toBeVisible()
  })

  test('workspace settings page renders', async ({ page }) => {
    await page.goto('/workspace/settings')
    await expect(page.locator('body')).toBeVisible()
  })
})
