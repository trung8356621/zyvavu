import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page or reuses authenticated session.
 */
export async function login({
  page,
  serverURL = 'http://zyvavu.test',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin`)

  if (!page.url().includes('/admin/login')) {
    return
  }

  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/admin`)
}
