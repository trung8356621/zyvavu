import { chromium } from '@playwright/test'

async function dumpHtml() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.goto('http://zyvavu.test/admin/globals/settings')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const content = await page.locator('.render-fields, .tabs-field').first().innerHTML()
  console.log('TABS INNER HTML:\n', content.slice(0, 2000))
  await browser.close()
}

dumpHtml().catch(console.error)
