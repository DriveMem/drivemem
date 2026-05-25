import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('landing page loads with hero', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /one memory/i })).toBeVisible()
  })

  test('navigation links visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('DriveMem')).toBeVisible()
  })

  test('has JSON-LD structured data', async ({ page }) => {
    await page.goto('/')
    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd).toBeAttached()
  })
})
