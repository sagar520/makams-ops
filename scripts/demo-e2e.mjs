// Headless click-through of the demo build.
import { chromium } from 'playwright'

const BASE = 'http://localhost:8788'
const errors = []
let failed = 0

const browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

async function expectText(text, label) {
  try {
    await page.waitForSelector(`text=${text}`, { timeout: 8000 })
    console.log(`PASS  ${label}`)
  } catch {
    failed++
    console.log(`FAIL  ${label} — did not find "${text}"`)
  }
}


async function clickTabAndExpect(tabSelector, text, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await page.click(tabSelector, { timeout: 3000 }) } catch { /* may already be active */ }
    try {
      await page.waitForSelector(`text=${text}`, { timeout: 4000 })
      console.log(`PASS  ${label}`)
      return
    } catch { /* retry */ }
  }
  failed++
  console.log(`FAIL  ${label} — did not find "${text}"`)
}

// 1. Dashboard
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
await expectText('Hi Aakash', 'dashboard renders')
await expectText('Waiting on your approval', 'approvals card renders')
await expectText('PO/26-27/0005', 'pending PO (step 2 = me) listed on dashboard')

// 2. People
await page.goto(`${BASE}/#/people`)
await expectText('Deepak Verma', 'people list renders')
await clickTabAndExpect('button:has-text("Candidates")', 'Neha Malhotra', 'candidates tab')

// 3. Person detail + checklist tab
await page.goto(`${BASE}/#/people/p-09`)
await expectText('Vikram Rathi', 'person detail renders')
await clickTabAndExpect('button:has-text("Checklists")', 'Standard onboarding — 5/10', 'onboarding checklist shows')
await expectText('Learnapp account created', 'checklist items show')

// 4. PO list + detail
await page.goto(`${BASE}/#/pos`)
await expectText('PO/26-27/0006', 'PO list renders')
await page.goto(`${BASE}/#/pos/po-03`)
await expectText('Halogen moisture analyzer', 'PO detail items render')
await expectText('Approval chain', 'approval chain card')

// 5. Approve PO-03 (my turn as step 2)
await page.click('button:has-text("Approve")')
await page.waitForSelector('text=Approve PO/26-27/0005')
await page.fill('textarea', 'Approved in demo test')
await page.click('button:has-text("Approve PO")')
await expectText('Fully approved', 'PO approved — timeline updated')

// 6. Record a receipt on PO-04
await page.goto(`${BASE}/#/pos/po-04`)
await page.click('button:has-text("Record receipt")')
await page.waitForSelector('text=Receiving now')
await page.click('button:has-text("Fill remaining")')
await page.click('button:has-text("Save receipt")')
await expectText('Received in full', 'receipt recorded, status = full')

// 7. Approvals page now empty
await page.goto(`${BASE}/#/approvals`)
await expectText('Nothing waiting on you', 'approvals inbox empty after acting')

// 8. Employee portal (public tokenised page)
await page.goto(`${BASE}/#/u/demo-arjun`)
await expectText('Hi Arjun', 'portal greets candidate')
await expectText('PAN card', 'portal lists requested docs')
await expectText('Your details', 'portal shows profile form')

// 9. Vendors + settings
await page.goto(`${BASE}/#/vendors`)
await expectText('Herbo Roots Agro LLP', 'vendors render')
await page.goto(`${BASE}/#/settings`)
await expectText('Invite user', 'settings users tab')
await clickTabAndExpect('button:has-text("Purchase setup")', 'Approval rules', 'approval rules card')
await expectText('Above ₹50,000 — two-step', 'seeded rule visible')

// 10. New PO flow: create draft and submit
await page.goto(`${BASE}/#/pos/new`)
await page.waitForSelector('text=New purchase order')
await page.selectOption('select >> nth=0', { label: 'Herbo Roots Agro LLP — Khanna' })
await page.selectOption('select >> nth=1', { label: 'Raw material' })
await page.selectOption('select >> nth=2', { label: 'Head Office — Ludhiana' })
await page.fill('textarea >> nth=0', 'Tulsi extract 2.5% ursolic acid')
await page.fill('input[type="number"] >> nth=0', '25')
await page.fill('input[type="number"] >> nth=1', '1800')
await page.click('button:has-text("Save & submit")')
await expectText('Approval chain', 'new PO submitted → detail page with chain')
await expectText('PO/26-27/0007', 'new PO got next number')

const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('Download the React DevTools'))
console.log(realErrors.length ? `\nERRORS:\n${realErrors.join('\n')}` : '\nNo console/page errors.')
console.log(failed === 0 && realErrors.length === 0 ? 'E2E RESULT: ALL PASS' : `E2E RESULT: ${failed} failures`)
await browser.close()
process.exit(failed === 0 ? 0 : 1)
