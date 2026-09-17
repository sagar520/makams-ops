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
{
  // source column + filter
  const cell = page.locator('td', { hasText: 'LI / Indeed' }).first()
  try { await cell.waitFor({ timeout: 8000 }); console.log('PASS  prospective source column shown') }
  catch { failed++; console.log('FAIL  prospective source column shown') }
}
{
  // filter to Internal Referral: Harjinder Pal (pr-02) stays, Sandeep Walia (LI / Indeed) disappears
  const selects = page.locator('div.mb-4 select')
  await selects.nth(2).selectOption('Internal Referral')
  await page.waitForTimeout(400)
  const gone = await page.locator('td', { hasText: 'Sandeep Walia' }).count()
  const kept = await page.locator('td', { hasText: 'Harjinder Pal' }).count()
  if (gone === 0 && kept > 0) console.log('PASS  source filter works')
  else { failed++; console.log('FAIL  source filter works') }
  await selects.nth(2).selectOption('')
}

// 5. Candidates DB (referral database) — admin opens on the full list
await page.goto(`${BASE}/#/candidates`)
await expectText('Admin view — the whole database', 'admin sees the full DB by default')
await expectText('Ankit Malhotra', 'candidates DB renders')
// and can still narrow to one area — the view HR is locked to
{
  await page.click('button:has-text("Search by area")')
  await page.waitForSelector('text=Search an area to open the database', { timeout: 8000 })
  const leaked = await page.locator('td', { hasText: 'Ankit Malhotra' }).count()
  if (leaked === 0) console.log('PASS  area view lists nothing until searched')
  else { failed++; console.log('FAIL  rows visible in the area view without a search') }
  await page.locator('input[list="candidate-areas"]').fill('Ludhiana')
  await page.click('button:has-text("Search")')
  await page.waitForSelector('text=Ankit Malhotra', { timeout: 8000 })
  const other = await page.locator('td', { hasText: 'Harjinder Pal' }).count()   // Mohali
  if (other === 0) console.log('PASS  area search returns only that area')
  else { failed++; console.log('FAIL  area search leaked another area') }
}
{
  const cell = page.locator('td', { hasText: 'Ramesh Kumar' }).first()
  try { await cell.waitFor({ timeout: 8000 }); console.log('PASS  referred-by shown') }
  catch { failed++; console.log('FAIL  referred-by shown') }
}
await expectText('RM001', 'referrer EMP ID shown')
await expectText('In Prospectives', 'picked candidates flagged')
// push a Ludhiana candidate to prospectives
{
  const row = page.locator('tr', { hasText: 'Mohit Saini' })
  await row.locator('button:has-text("Add to Prospectives")').click()
  await page.waitForSelector('text=added to Prospectives', { timeout: 8000 })
}
console.log('PASS  add-to-prospectives works')
await page.goto(`${BASE}/#/prospectives`)
await expectText('Mohit Saini', 'copied row appears on the sheet')

// 6. Referral links tab
await page.goto(`${BASE}/#/candidates`)
await clickTabAndExpect('button:has-text("Referral links")', 'New referral link', 'referral links tab')
await expectText('Consultant Ramesh — TalentBridge', 'source link listed')

// 7. Public referral form: prefilled referrer, required fields, +91 phone
// 7a. a link issued to an employee prefills (and locks) the referrer
await page.goto(`${BASE}/#/f/demo-team-referrals`)
await expectText('This link was issued to you', 'employee link prefills the referrer')
{
  const name = page.locator('input').first()
  const val = await name.inputValue()
  const disabled = await name.isDisabled()
  if (val === 'Deepak Verma' && disabled) console.log('PASS  referrer name prefilled and locked')
  else { failed++; console.log(`FAIL  referrer prefill (value=${val} disabled=${disabled})`) }
}

// 7b. an expired link is refused
await page.goto(`${BASE}/#/f/demo-expired-link`)
await expectText('expired', 'expired link is refused')

// 7c. the open link: validation then a real submission
await page.goto(`${BASE}/#/f/demo-source-ramesh`)
await expectText('Candidate referral form', 'referral form renders')
await expectText('Your details', 'referrer section shows')
await expectText('Candidate 1', 'candidate rows show')

const cand = (i, label) => page.locator('div.rounded-lg', { hasText: `Candidate ${i}` }).locator(`label:has-text("${label}") input`).first()

await page.locator('input').first().fill('E2E Referrer')
await cand(1, 'Name').fill('Balwinder Sandhu')
await page.click('button:has-text("Submit")')
await expectText('Candidate 1: Phone number is required', 'missing required field blocked')

await cand(1, 'Designation').fill('Sales Officer')
await cand(1, 'Area').fill('Ludhiana')
await cand(1, 'Current company').fill('Nutra Foods')
await cand(1, 'Phone number').fill('1234567890')     // landline-style, not a mobile
await page.click('button:has-text("Submit")')
await expectText('10-digit mobile', 'bad phone blocked')

await cand(1, 'Phone number').fill('9000011111')
await page.click('button:has-text("Add another candidate")')
await expectText('Candidate 2', 'second candidate row added')
await cand(2, 'Name').fill('Half Filled')
await page.click('button:has-text("Submit")')
await expectText('Candidate 2: Phone number is required', 'half-filled second row blocked')
{
  // drop row 2 so only the complete candidate is submitted
  await page.locator('div.rounded-lg', { hasText: 'Candidate 2' }).locator('button').first().click()
}
await page.click('button:has-text("Submit")')
await expectText('Submitted — thank you', 'referral submission accepted')

await page.waitForTimeout(21000) // let queries go stale so remounts refetch
await page.goto(`${BASE}/#/candidates`)
await clickTabAndExpect('button:has-text("Submissions")', 'Gaurav Nanda', 'submissions queue renders (seeded)')
await expectText('Balwinder Sandhu', 'new submission waits for review')
await expectText('E2E Referrer', 'submission grouped under referrer')
await expectText('+919000011111', 'phone stored in +91 form')

// 7d. back to the database (admin: full list)
await clickTabAndExpect('button:has-text("Database")', 'Ankit Malhotra', 'database tab renders')

// 7e. HR comment edits inline
{
  const row = page.locator('tr', { hasText: 'Ankit Malhotra' })
  await row.locator('td').nth(6).locator('button').click()
  const box = row.locator('textarea')
  await box.fill('Called — keen to move')
  await box.press('Enter')
  await page.waitForSelector('text=Comment saved', { timeout: 8000 })
  console.log('PASS  HR comment edited inline')
}

// 7f. the pending entry is not in the DB until approved
{
  const inDb = await page.locator('td', { hasText: 'Balwinder Sandhu' }).count()
  if (inDb === 0) console.log('PASS  pending entry not in DB before approval')
  else { failed++; console.log('FAIL  pending entry leaked into DB') }
}
// approve it from the queue
await clickTabAndExpect('button:has-text("Submissions")', 'Balwinder Sandhu', 'submissions tab again')
{
  const row = page.locator('li', { hasText: 'Balwinder Sandhu' })
  await row.locator('button:has-text("Approve")').click()
  await page.waitForSelector('text=added to the Candidates DB', { timeout: 8000 })
}
console.log('PASS  approve moves entry to DB')
await clickTabAndExpect('button:has-text("Database")', 'Balwinder Sandhu', 'approved candidate now in DB')

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
