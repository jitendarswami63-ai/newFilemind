import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_DIR = path.join(process.cwd(), 'presentation_assets')

async function run() {
  console.log('Launching Chrome via puppeteer-core...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()

  // 1. Capture Login Page
  console.log('Navigating to Login...')
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1000))
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_login_interface.png') })
  console.log('Saved 05_login_interface.png')

  // 2. Perform Login
  console.log('Entering login credentials...')
  await page.type('#email', 'presentation_demo@filemind.app')
  await page.type('#password', 'FileMindPresentation2026!')
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  console.log('Waiting for dashboard navigation...')
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch((e) => {
    console.log('Navigation event timed out, continuing...', e.message)
  })

  await new Promise((r) => setTimeout(r, 2000))

  // 3. Capture Dashboard
  console.log('Capturing Dashboard...')
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_dashboard.png') })
  console.log('Saved 01_dashboard.png')

  // 4. Capture Documents Vault
  console.log('Capturing Documents Vault...')
  await page.goto('http://localhost:3000/documents', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_documents_vault.png') })
  console.log('Saved 03_documents_vault.png')

  // 5. Capture Search Interface
  console.log('Capturing Search Interface...')
  await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1500))

  // Type a sample search query
  const searchInput = await page.$('input[type="search"], input[placeholder*="Search"]')
  if (searchInput) {
    await searchInput.type('Financial Revenue and EBITDA', { delay: 50 })
    await page.keyboard.press('Enter')
    await new Promise((r) => setTimeout(r, 2000))
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_search_interface.png') })
  console.log('Saved 04_search_interface.png')

  await browser.close()
  console.log('All screenshots captured successfully!')
}

run().catch((err) => {
  console.error('Screenshot script failed:', err)
  process.exit(1)
})
