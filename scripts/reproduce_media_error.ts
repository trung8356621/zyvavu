import { chromium } from '@playwright/test'

async function testMediaPicker() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()

  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text())
  })
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err)
  })
  page.on('requestfailed', (req) => {
    console.error(`[REQUEST FAILED]: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
  })
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.error(`[HTTP ${res.status()}]: ${res.request().method()} ${res.url()}`)
    }
  })

  await page.goto('http://zyvavu.test/admin/globals/settings')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const logoField = page.locator('#field-logo')
  const buttonsInLogo = await logoField.locator('button').allInnerTexts()
  console.log('Buttons inside #field-logo:', buttonsInLogo)

  // Look for "Choose from existing" or "Select from existing" or file upload
  const chooseBtn = logoField.locator('button', { hasText: /Choose|Select/i }).first()
  if (await chooseBtn.count() > 0) {
    console.log('Clicking choose button:', await chooseBtn.innerText())
    await chooseBtn.click()
    await page.waitForTimeout(2000)

    // Check drawers
    const drawers = await page.locator('.drawer__content, .list-drawer').all()
    console.log('Drawers open:', drawers.length)
    if (drawers.length > 0) {
      console.log('Drawer text:\n', await drawers[0].innerText())

      // Look for media items to select
      const rows = await drawers[0].locator('tbody tr, .file-card, button.thumbnail').all()
      console.log('Media items found in drawer:', rows.length)
      if (rows.length > 0) {
        console.log('Clicking first media item...')
        await rows[0].click()
        await page.waitForTimeout(2000)
      } else {
        console.log('No media items found in drawer table.')
      }
    }
  }

  // Check state of #field-logo after attempt
  console.log('#field-logo HTML after attempt:\n', await logoField.innerHTML())

  await browser.close()
}

testMediaPicker().catch(console.error)
