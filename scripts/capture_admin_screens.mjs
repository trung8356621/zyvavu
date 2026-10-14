import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { jwtSign } from '../node_modules/payload/dist/auth/jwt.js'

const outputDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1115c123-a2d4-4caa-bc7c-3e31707b104d\\screenshots'
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const secret = process.env.PAYLOAD_SECRET
const { token } = await jwtSign({
  fieldsToSign: { id: 7, collection: 'users', email: 'trungtien1993@gmail.com' },
  secret,
  tokenExpiration: 7200,
})

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})

const targets = [
  { name: 'dashboard', url: 'http://127.0.0.1:3107/admin' },
  { name: 'posts-list', url: 'http://127.0.0.1:3107/admin/collections/posts' },
  { name: 'categories-list', url: 'http://127.0.0.1:3107/admin/collections/categories' },
  { name: 'pages-list', url: 'http://127.0.0.1:3107/admin/collections/pages' },
  { name: 'tags-list', url: 'http://127.0.0.1:3107/admin/collections/tags' },
  { name: 'media-list', url: 'http://127.0.0.1:3107/admin/collections/media' },
  { name: 'menus-list', url: 'http://127.0.0.1:3107/admin/collections/menus' },
  { name: 'site-settings', url: 'http://127.0.0.1:3107/admin/globals/settings' },
  { name: 'post-editor', url: 'http://127.0.0.1:3107/admin/collections/posts/create' },
  { name: 'frontend', url: 'http://127.0.0.1:3107/' },
]

async function captureSet(prefix, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
  })

  await context.addCookies([
    {
      name: 'payload-token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  const page = await context.newPage()

  for (const target of targets) {
    try {
      console.log(`Capturing ${prefix} - ${target.name}...`)
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(1000)
      const filePath = path.join(outputDir, `${prefix}-${target.name}.png`)
      await page.screenshot({ path: filePath, fullPage: false })
      console.log(`Saved ${filePath}`)
    } catch (e) {
      console.error(`Failed ${prefix} - ${target.name}:`, e.message)
    }
  }

  await context.close()
}

console.log('Capturing Desktop 1440x900...')
await captureSet('desktop-1440x900', 1440, 900)

console.log('Capturing Mobile 390x844...')
await captureSet('mobile-390x844', 390, 844)

await browser.close()
console.log('Screenshots completed successfully!')
process.exit(0)
