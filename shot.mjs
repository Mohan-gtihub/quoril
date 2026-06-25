import { chromium } from 'playwright-core'

const url = process.argv[2] || 'http://localhost:5199/'
const out = process.argv[3] || 'shot.png'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(2500)
await page.screenshot({ path: out, fullPage: false })
console.log('saved', out, 'title=', await page.title())
await browser.close()