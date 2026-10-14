import { chromium } from '@playwright/test'

async function dumpLogoHtml() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.goto('http://zyvavu.test/admin/globals/settings')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const logoField = page.locator('#field-logo')
  console.log('LOGO FIELD HTML:\n', await logoField.evaluate(el => el.outerHTML))
  await browser.close()
}

dumpLogoHtml().catch(console.error)
