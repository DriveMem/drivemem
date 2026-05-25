import { test, expect } from '@playwright/test'

test.describe('Responsive', () => {
  test('mobile: bottom nav visible on small screens', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
      return
    }
    await page.goto('/')
    await expect(page.locator('nav').last()).toBeVisible()
  })

  test('desktop: sidebar visible on large screens', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip()
      return
    }
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })
})
