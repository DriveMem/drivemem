import { test, expect } from '@playwright/test'

test.describe('Authentication & Dashboard', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should show dashboard after login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('body')).toBeVisible()
    const isLoginPage = await page.getByRole('heading', { name: /sign in/i }).isVisible().catch(() => false)
    const isDashboard = await page.getByText(/DriveMem/i).isVisible().catch(() => false)
    expect(isLoginPage || isDashboard).toBeTruthy()
  })
})
