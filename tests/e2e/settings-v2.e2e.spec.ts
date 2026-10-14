import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screenshotsDir = path.resolve(__dirname, '../../test-screenshots')

test.describe('Site Settings V2 & SEO Settings', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('desktop 1440x900: site settings sections and navigation', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    await login({ page, user: testUser })

    // 1. Navigate to Settings
    await page.goto('http://zyvavu.test/admin/globals/settings')
    await page.waitForLoadState('networkidle')

    // Confirm vertical tabs
    const tabsContainer = page.locator('.zyvavu-settings-tabs')
    await expect(tabsContainer).toBeVisible()

    // General tab
    const generalTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'General' })
    await expect(generalTabBtn).toBeVisible()
    await generalTabBtn.click()

    // Verify fields in General: siteName, tagline, siteUrl, logo, favicon
    await expect(page.locator('#field-siteName')).toBeVisible()
    await expect(page.locator('#field-tagline')).toBeVisible()
    await expect(page.locator('#field-siteUrl')).toBeVisible()
    await expect(page.locator('.field-type.upload').first()).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '01-desktop-settings-general.png') })

    // 2. Click Date & Time tab
    const dateTimeTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'Date & Time' })
    await dateTimeTabBtn.click()
    await expect(page.locator('#field-timezone')).toBeVisible()
    await expect(page.locator('#field-dateFormat')).toBeVisible()
    await expect(page.locator('#field-timeFormat')).toBeVisible()
    await expect(page.locator('#field-weekStartsOn')).toBeVisible()
    // Live preview
    await expect(page.getByText('Live Preview')).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '02-desktop-settings-datetime.png') })

    // 3. Click Reading tab
    const readingTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'Reading' })
    await readingTabBtn.click()
    await expect(page.locator('#field-postsPerPage')).toBeVisible()
    // Ensure homepage selector is NOT present
    await expect(page.locator('#field-homepage')).toHaveCount(0)

    await page.screenshot({ path: path.join(screenshotsDir, '03-desktop-settings-reading.png') })

    // 4. Click Permalinks tab
    const permalinksTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'Permalinks' })
    await permalinksTabBtn.click()
    await expect(page.locator('#field-postPermalinkStructure')).toBeVisible()
    await expect(page.getByText('URL Registry Contract')).toBeVisible()
    await expect(page.getByText('Posts prefix', { exact: true })).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '04-desktop-settings-permalinks.png') })

    // 5. Click Languages tab
    const languagesTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'Languages' })
    await languagesTabBtn.click()
    await expect(page.locator('#field-language')).toBeVisible()
    await expect(page.locator('#field-secondaryLanguage')).toBeVisible()
    await expect(page.getByText('DEC-LANG-001 Multilingual Foundation')).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '05-desktop-settings-languages.png') })

    // 6. Click PWA tab
    const pwaTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'PWA' })
    await pwaTabBtn.click()
    await expect(page.locator('#field-pwaEnabled')).toBeVisible()
    await expect(page.locator('#field-offlinePageLimit')).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '06-desktop-settings-pwa.png') })

    // 7. SEO Settings link in sidebar
    const seoNavLink = page.locator('.zyvavu-nav__link', { hasText: 'SEO settings' })
    await expect(seoNavLink).toBeVisible()
    await seoNavLink.click()
    await page.waitForURL('**/admin/seo-settings')

    await expect(page.locator('h1', { hasText: 'SEO Settings' })).toBeVisible()
    await expect(page.getByText('SEO configuration will be available in a future implementation.')).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '07-desktop-seo-settings.png') })
  })

  test('mobile 390x844: responsive settings and seo settings', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await login({ page, user: testUser })

    // Settings mobile
    await page.goto('http://zyvavu.test/admin/globals/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.tabs-field__tabs')).toBeVisible({ timeout: 15000 })

    const generalTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'General' })
    await expect(generalTabBtn).toBeVisible()
    await generalTabBtn.dispatchEvent('click')

    await page.screenshot({ path: path.join(screenshotsDir, '08-mobile-settings-general.png') })

    // Date & Time mobile
    const dateTimeTabBtn = page.locator('.tabs-field__tab-button', { hasText: 'Date & Time' })
    await dateTimeTabBtn.dispatchEvent('click')
    await expect(page.getByText('Live Preview')).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '09-mobile-settings-datetime.png') })

    // SEO settings mobile
    await page.goto('http://zyvavu.test/admin/seo-settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1', { hasText: 'SEO Settings' })).toBeVisible()

    await page.screenshot({ path: path.join(screenshotsDir, '10-mobile-seo-settings.png') })
  })

  test('seo-settings route displays placeholder and is linked in sidebar', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('http://zyvavu.test/admin/seo-settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1', { hasText: 'SEO Settings' })).toBeVisible()
    await expect(page.getByText('SEO configuration will be available in a future implementation.')).toBeVisible()
    const navLink = page.locator('.zyvavu-nav__link', { hasText: 'SEO settings' })
    await expect(navLink).toBeVisible()
    await expect(navLink).toHaveClass(/is-active/)
  })
})
