import 'dotenv/config'
import { chromium } from '@playwright/test'
import { jwtSign } from '../node_modules/payload/dist/auth/jwt.js'

const secret = process.env.PAYLOAD_SECRET
const { token } = await jwtSign({
  fieldsToSign: {
    id: 7,
    collection: 'users',
    email: 'trungtien1993@gmail.com',
    role: 'system-admin',
    sid: 'b4f37667-b545-41c4-8d68-692a3c30c8a7'
  },
  secret,
  tokenExpiration: 7200,
})

console.log('Token created successfully. Launching browser...')
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})

const context = await browser.newContext()
await context.setExtraHTTPHeaders({
  'Sec-Fetch-Site': 'same-origin',
})
await context.addCookies([
  {
    name: 'payload-token',
    value: token,
    url: 'http://zyvavu.test',
  },
])

const page = await context.newPage()
page.on('console', msg => console.log('LOG:', msg.type(), msg.text()))
page.on('pageerror', err => console.log('ERROR:', err.message))
console.log('Navigating to http://zyvavu.test/admin/collections/posts ...')
await page.goto('http://zyvavu.test/admin/collections/posts', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(5000)
console.log('Current URL:', page.url())
const title = await page.title()
console.log('Page title:', title)
console.log('HTML length:', (await page.content()).length)
console.log('HTML slice:', (await page.content()).substring(0, 1500))
await page.screenshot({ path: 'test-posts.png' })
console.log('Screenshot saved to test-posts.png')

await browser.close()
process.exit(0)
