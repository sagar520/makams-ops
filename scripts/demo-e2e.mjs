// Headless click-through of the demo build (VITE_DEMO=1, served on :8788).
// Run: PW_EXEC=/path/to/chromium node scripts/demo-e2e.mjs   (PW_EXEC optional)
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
await expectText('Prospectives open', 'HR stats show prospectives')
await expectText('Waiting on your approval', 'approvals card renders')
await expectText('PO/26-27/0005', 'pending PO (step 2 = me) listed on dashboard')

// 2. Employees (sales-only)
await page.goto(`${BASE}/#/people`)
await expectText('Deepak Verma', 'employees list renders')
await expectText('RM001', 'EMP IDs shown')
await expectText('Ludhiana', 'HQ column shown')
await clickTabAndExpect('button:has-text("Joining")', 'Neha Malhotra', 'joining tab')

// 3. Person detail + checklist + learnapp emp-id login
await page.goto(`${BASE}/#/people/p-09`)
await expectText('Vikram Rathi', 'person detail renders')
await expectText('Bathinda', 'HQ on profile')
await clickTabAndExpect('button:has-text("Checklists")', 'Standard onboarding — 5/10', 'onboarding checklist shows')
await clickTabAndExpect('button:has-text("Learnapp")', 'SALES006', 'learnapp tab shows EMP ID login')

// 4. Prospectives sheet
await page.goto(`${BASE}/#/prospectives`)
await expectText('Sandeep Walia', 'prospectives sheet renders')
{
  const badge = page.locator('td:has-text("from DB")').first()
  try { await badge.waitFor({ timeout: 8000 }); console.log('PASS  DB-linked rows badged') }
  catch { failed++; console.log('FAIL  DB-linked rows badged') }
}
{
  const row = page.locator('tr', { hasText: 'Jaspreet Brar' })
  await row.locator('select').selectOption('contacted')
  await page.waitForTimeout(600)
}
console.log('PASS  prospective status changed inline')

// 5. Candidates DB (referral database)
await page.goto(`${BASE}/#/candidates`)
await expectText('Ankit Malhotra', 'candidates DB renders')
{
  const cell = page.locator('td', { hasText: 'Ramesh Kumar' }).first()
  try { await cell.waitFor({ timeout: 8000 }); console.log('PASS  referred-by shown') }
  catch { failed++; console.log('FAIL  referred-by shown') }
}
await expectText('RM001', 'referrer EMP ID shown')
await expectText('In Prospectives', 'picked candidates flagged')
// push Shreya Iyer to prospectives
{
  const row = page.locator('tr', { hasText: 'Shreya Iyer' })
  await row.locator('button:has-text("Add to Prospectives")').click()
  await page.waitForSelector('text=added to Prospectives', { timeout: 8000 })
}
console.log('PASS  add-to-prospectives works')
await page.goto(`${BASE}/#/prospectives`)
await expectText('Shreya Iyer', 'copied row appears on the sheet')

// 6. Referral links tab
await page.goto(`${BASE}/#/candidates`)
await clickTabAndExpect('button:has-text("Referral links")', 'New referral link', 'referral links tab')
await expectText('Consultant Ramesh — TalentBridge', 'source link listed')

// 7. Public referral form: referrer details + multiple candidates
await page.goto(`${BASE}/#/f/demo-source-ramesh`)
await expectText('Candidate referral form', 'referral form renders')
await expectText('Your details', 'referrer section shows')
await expectText('Candidate 1', 'candidate rows show')
await page.fill('input >> nth=0', 'E2E Referrer')
await page.fill('input >> nth=3', 'Balwinder Sandhu')   // candidate 1 name
await page.fill('input >> nth=4', '90000 11111')        // candidate 1 phone
await page.click('button:has-text("Add another candidate")')
await expectText('Candidate 2', 'second candidate row added')
await page.click('button:has-text("Submit")')
await expectText('Submitted — thank you', 'referral submission accepted')
await page.waitForTimeout(21000) // let the candidates query go stale so remount refetches
await page.goto(`${BASE}/#/candidates`)
await expectText('Balwinder Sandhu', 'submission created a candidate')
{
  const cell = page.locator('td', { hasText: 'E2E Referrer' }).first()
  try { await cell.waitFor({ timeout: 8000 }); console.log('PASS  candidate tagged with referrer') }
  catch { failed++; console.log('FAIL  candidate tagged with referrer') }
}

// 8. Admin: forms + checklists in settings
await page.goto(`${BASE}/#/settings`)
await clickTabAndExpect('button:has-text("Forms")', 'Candidate referral form', 'forms tab lists referral form')
await page.click('button:has-text("New form")')
await expectText('Add field', 'form builder opens')
await page.keyboard.press('Escape')
await clickTabAndExpect('button:has-text("Checklists")', 'Standard onboarding', 'checklists managed in settings')

// 9. Purchase side (regression)
await page.goto(`${BASE}/#/pos`)
await expectText('PO/26-27/0006', 'PO list renders')
await page.goto(`${BASE}/#/pos/po-03`)
await expectText('Halogen moisture analyzer', 'PO detail items render')
await expectText('Approval chain', 'approval chain card')
await page.click('button:has-text("Approve")')
await page.waitForSelector('text=Approve PO/26-27/0005')
await page.fill('textarea', 'Approved in demo test')
await page.click('button:has-text("Approve PO")')
await expectText('Fully approved', 'PO approved — timeline updated')
await page.goto(`${BASE}/#/pos/po-04`)
await page.click('button:has-text("Record receipt")')
await page.waitForSelector('text=Receiving now')
await page.click('button:has-text("Fill remaining")')
await page.click('button:has-text("Save receipt")')
await expectText('Received in full', 'receipt recorded, status = full')
await page.goto(`${BASE}/#/approvals`)
await expectText('Nothing waiting on you', 'approvals inbox empty after acting')
await page.goto(`${BASE}/#/vendors`)
await expectText('Herbo Roots Agro LLP', 'vendors render')

// 10. New PO flow
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
