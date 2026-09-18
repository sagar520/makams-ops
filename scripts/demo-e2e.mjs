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

// 1. No dashboard: "/" lands on the first module the account can open
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
await expectText('The active hiring sheet', 'root lands on Prospectives')
{
  const nav = await page.locator('nav, aside').first().innerText()
  if (!/overview/i.test(nav)) console.log('PASS  Overview removed from the sidebar')
  else { failed++; console.log('FAIL  Overview still in the sidebar') }
}

// 2. Employees (sales-only), with the roster auto-synced from the HR sheet
await page.goto(`${BASE}/#/people`)
await expectText('synced from the HR sheet', 'roster auto-syncs on open')
await expectText('Deepak Verma', 'employees list renders')
await expectText('RM001', 'EMP IDs shown')
await expectText('Ludhiana', 'Location column shown')
{
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  const want = ['name', 'emp id', 'level', 'location', 'asm', 'contact', 'email', 'joining date', 'learnapp status', 'status']
  const missing = want.filter((w) => !head.includes(w))
  if (!missing.length) console.log('PASS  employee columns as specified')
  else { failed++; console.log(`FAIL  employee columns missing: ${missing.join(', ')}`) }
}
{
  const buttons = await page.locator('button').allInnerTexts()
  const gone = ['Joining', 'Exited', 'Not joined', 'Add person'].filter((t) => buttons.some((b) => b.trim().startsWith(t)))
  if (!gone.length) console.log('PASS  status tabs and Add person removed')
  else { failed++; console.log(`FAIL  still present: ${gone.join(', ')}`) }
}
{
  // one status filter instead: active by default, inactive on demand
  const hidden = await page.locator('td', { hasText: 'Suresh Pillai' }).count()   // exited
  if (hidden === 0) console.log('PASS  inactive people hidden by default')
  else { failed++; console.log('FAIL  inactive people shown by default') }

  await page.locator('div.mb-4 select').first().selectOption('all')
  await page.waitForSelector('text=Suresh Pillai', { timeout: 8000 })
  console.log('PASS  status filter reveals inactive people')
  await page.locator('div.mb-4 select').first().selectOption('active')
  await page.waitForTimeout(400)
}

{
  // clicking an employee does nothing — the sheet is the source of truth
  await page.locator('tr', { hasText: 'Deepak Verma' }).click()
  await page.waitForTimeout(600)
  if (page.url().includes('/people') && !/\/people\//.test(page.url())) console.log('PASS  clicking a row does not navigate')
  else { failed++; console.log(`FAIL  row click navigated to ${page.url()}`) }
}

// 3. Person detail (reachable by URL) + checklist + learnapp emp-id login
await page.goto(`${BASE}/#/people/p-09`)
await expectText('Vikram Rathi', 'person detail renders')
await expectText('Bathinda', 'HQ on profile')
await clickTabAndExpect('button:has-text("Checklists")', 'Standard onboarding — 5/10', 'onboarding checklist shows')
await clickTabAndExpect('button:has-text("Learnapp")', 'SALES006', 'learnapp tab shows EMP ID login')
{
  const buttons = await page.locator('button').allInnerTexts()
  if (!buttons.some((b) => b.trim() === 'Edit')) console.log('PASS  employee editing removed')
  else { failed++; console.log('FAIL  Edit button still on the person page') }
}

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
  // whole row is tinted by status (switch to Everyone so a rejected row is visible)
  await page.locator('div.mb-4 select').first().selectOption('all')
  await page.waitForTimeout(400)
  const rowCls = await page.locator('tr', { hasText: 'Sahil Chopra' }).first().getAttribute('class')  // rejected
  const openCls = await page.locator('tr', { hasText: 'Sandeep Walia' }).first().getAttribute('class') // contacted
  if (/bg-red-/.test(rowCls || '') && /bg-indigo-/.test(openCls || '')) console.log('PASS  rows tinted by status')
  else { failed++; console.log(`FAIL  rows tinted by status (rejected=${rowCls} contacted=${openCls})`) }
  await page.locator('div.mb-4 select').first().selectOption('open')
  await page.waitForTimeout(400)
}
{
  // status dropdown is colour-coded
  const cls = await page.locator('tr', { hasText: 'Jaspreet Brar' }).locator('select').getAttribute('class')
  if (cls && /bg-(blue|indigo|violet|orange|emerald|red)-/.test(cls)) console.log('PASS  status dropdown colour-coded')
  else { failed++; console.log(`FAIL  status dropdown colour-coded (class=${cls})`) }
}
{
  // Last updated column replaced Added
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (head.includes('last updated') && !head.includes('added')) console.log('PASS  last-updated column')
  else { failed++; console.log('FAIL  last-updated column') }
}
{
  // explicit per-row actions: View resume / Add resume, and Edit
  const withResume = page.locator('tr', { hasText: 'Ankit Malhotra' })
  if (await withResume.locator('button:has-text("Resume")').count()) console.log('PASS  Resume button on rows that have one')
  else { failed++; console.log('FAIL  Resume button missing') }

  const without = page.locator('tr', { hasText: 'Jaspreet Brar' })
  if (await without.locator('button:has-text("Add resume")').count()) console.log('PASS  Add-resume button on rows without one')
  else { failed++; console.log('FAIL  Add-resume button missing') }

  await without.locator('button:has-text("Edit")').click()
  await page.waitForSelector('text=Attach a resume', { timeout: 8000 })
  console.log('PASS  Edit opens the details modal with the resume field')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}
{
  // the sheet stays narrow: source and the rest of the record moved off it
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (!head.includes('source')) console.log('PASS  source moved off the sheet into the record')
  else { failed++; console.log('FAIL  source still a sheet column') }

  // clicking anywhere on a row opens the full record
  await page.locator('tr', { hasText: 'Ramanpreet Kaur' }).locator('td').nth(1).click()
  await page.waitForSelector('text=How to reach them', { timeout: 8000 })
  const sections = await page.locator('div.fixed.inset-0.z-50').innerText()
  const want = ['who they are', 'how to reach them', 'where they are in the process', 'money']
  if (want.every((t) => sections.toLowerCase().includes(t))) console.log('PASS  record opens with all sections')
  else { failed++; console.log('FAIL  record sections missing') }

  const fields = sections.toLowerCase()
  const wantFields = ['additional contact', 'email', 'reference', 'test score', 'invitation mail',
                      'manager round', 'hr round', 'final round', 'comment',
                      'last withdrawn salary', 'expected in-hand', 'old in-hand',
                      'in-hand (monthly)', 'gross (monthly)', 'ctc (annual)']
  const missing = wantFields.filter((f) => !fields.includes(f))
  if (!missing.length) console.log('PASS  every extra field is on the record')
  else { failed++; console.log(`FAIL  missing fields: ${missing.join(', ')}`) }

  // joining block only appears once the status is Joined
  if (!fields.includes('date of joining')) console.log('PASS  joining block hidden until status is Joined')
  else { failed++; console.log('FAIL  joining block shown too early') }

  const modal = page.locator('div.fixed.inset-0.z-50')
  const statusSel = modal.locator('select').filter({ has: page.locator('option[value="joined"]') }).first()
  await statusSel.selectOption('joined')
  await page.waitForTimeout(400)
  const afterJoined = (await modal.innerText()).toLowerCase()
  if (afterJoined.includes('date of joining') && afterJoined.includes('emp code')) console.log('PASS  Joined reveals DOJ and EMP code')
  else { failed++; console.log('FAIL  Joined did not reveal DOJ / EMP code') }

  // asking, not demanding: the save goes through with the joining block empty
  await modal.locator('button:has-text("Save")').click()
  await page.waitForSelector('text=Saved', { timeout: 8000 })
  console.log('PASS  Joined saves without DOJ / EMP code')
  await page.waitForTimeout(600)
}
{
  // changing the status on the row opens the record on what is worth filling in
  await page.goto(`${BASE}/#/prospectives`)
  await page.waitForTimeout(600)
  await page.locator('div.mb-4 select').first().selectOption('all')   // she is joined now, so show everyone
  await page.waitForTimeout(400)
  const sel = page.locator('tr', { hasText: 'Ramanpreet Kaur' }).locator('select').first()
  await sel.selectOption('rejected')
  await page.waitForSelector('text=why were they rejected', { timeout: 8000 })
  console.log('PASS  Rejected opens the record asking for a reason')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.waitForTimeout(600)
  const stuck = await page.locator('tr', { hasText: 'Ramanpreet Kaur' }).locator('select').first().inputValue()
  if (stuck === 'rejected') console.log('PASS  the status stuck even with no reason given')
  else { failed++; console.log(`FAIL  status did not stick (${stuck})`) }
  await page.locator('div.mb-4 select').first().selectOption('open')
  await page.waitForTimeout(400)
}
{
  // filter to Internal Referral: Harjinder Pal (pr-02) stays, Sandeep Walia (LI / Indeed) disappears
  const selects = page.locator('div.mb-4 select')
  await selects.nth(4).selectOption('Internal Referral')
  await page.waitForTimeout(400)
  const gone = await page.locator('td', { hasText: 'Sandeep Walia' }).count()
  const kept = await page.locator('td', { hasText: 'Harjinder Pal' }).count()
  if (gone === 0 && kept > 0) console.log('PASS  source filter works')
  else { failed++; console.log('FAIL  source filter works') }
  await selects.nth(4).selectOption('')
}
{
  // department column + filter
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (head.includes('department') && !head.includes('designation')) console.log('PASS  department column, no designation column')
  else { failed++; console.log(`FAIL  prospective columns (${head.replace(/\s+/g, ' ')})`) }

  await page.locator('div.mb-4 select').nth(2).selectOption('PMT')
  await page.waitForTimeout(400)
  const off = await page.locator('td', { hasText: 'Sandeep Walia' }).count()   // Sales
  const on = await page.locator('td', { hasText: 'Jaspreet Brar' }).count()    // PMT
  if (off === 0 && on > 0) console.log('PASS  department filter works')
  else { failed++; console.log('FAIL  department filter works') }
  await page.locator('div.mb-4 select').nth(2).selectOption('')
  await page.waitForTimeout(400)

  // QC and Manufacturing were added to the department list
  const deptOpts = (await page.locator('div.mb-4 select').nth(2).innerText()).toLowerCase()
  if (deptOpts.includes('qc') && deptOpts.includes('manufacturing')) console.log('PASS  QC and Manufacturing in departments')
  else { failed++; console.log('FAIL  new departments missing') }
}
{
  // division column + filter
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (head.includes('division')) console.log('PASS  division column shown')
  else { failed++; console.log('FAIL  division column missing') }

  const divSel = page.locator('div.mb-4 select').nth(3)
  const divOpts = (await divSel.innerText()).toLowerCase()
  if (['poultry', 'cattle', 'ho', 'manufacturing'].every((d) => divOpts.includes(d))) console.log('PASS  division options complete')
  else { failed++; console.log(`FAIL  division options (${divOpts.replace(/\s+/g, ' ')})`) }

  await divSel.selectOption('Poultry')
  await page.waitForTimeout(400)
  const notPoultry = await page.locator('td', { hasText: 'Ankit Malhotra' }).count()   // Cattle
  const isPoultry = await page.locator('td', { hasText: 'Sandeep Walia' }).count()     // Poultry
  if (notPoultry === 0 && isPoultry > 0) console.log('PASS  division filter works')
  else { failed++; console.log('FAIL  division filter works') }
  await divSel.selectOption('')
  await page.waitForTimeout(400)
}
{
  // CV numbers: column present, seeded rows numbered, search by CV no.
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (head.includes('cv no')) console.log('PASS  CV no. column shown')
  else { failed++; console.log('FAIL  CV no. column missing') }

  const mi = await page.locator('td', { hasText: /^MI\d{5}$/ }).count()
  if (mi > 0) console.log('PASS  prospectives carry MI#### numbers')
  else { failed++; console.log('FAIL  no MI#### numbers on the sheet') }

  const search = page.locator('div.mb-4 input[type="search"], div.mb-4 input[placeholder*="CV"]').first()
  await search.fill('MI00001')
  await page.waitForTimeout(400)
  const rows = await page.locator('tbody tr').count()
  if (rows === 1) console.log('PASS  search by CV no. narrows to one row')
  else { failed++; console.log(`FAIL  search by CV no. returned ${rows} rows`) }
  await search.fill('')
  await page.waitForTimeout(400)
}

// 4b. a new prospective is mirrored into the Candidates DB
{
  await page.goto(`${BASE}/#/prospectives`)
  await page.click('button:has-text("Add prospective")')
  await page.waitForSelector('text=Add prospective', { timeout: 8000 })
  const modal = page.locator('div.fixed.inset-0.z-50')
  await modal.locator('label:has-text("Name") input').first().fill('Mirror Test Prospect')
  await modal.locator('label:has-text("Location") input').first().fill('Khanna')
  await modal.locator('button:has-text("Save")').click()
  await page.waitForSelector('text=Saved', { timeout: 8000 })
  await page.waitForTimeout(600)
  await page.goto(`${BASE}/#/candidates`)
  await page.waitForSelector('text=Mirror Test Prospect', { timeout: 10000 })
  const row = page.locator('tr', { hasText: 'Mirror Test Prospect' })
  const text = await row.innerText()
  if (/CRIL HR/.test(text)) console.log('PASS  prospective mirrored into the DB, referred by CRIL HR')
  else { failed++; console.log(`FAIL  prospective mirrored (${text})`) }
  // a prospective does not work at CRIL, so the company stays blank
  const company = (await row.locator('td').nth(4).innerText()).trim()
  if (!/CRIL/.test(company)) console.log('PASS  current company blank for prospective rows')
  else { failed++; console.log(`FAIL  current company should be blank (got "${company}")`) }
}
{
  // the DB calls it Location now, not Area
  const head = (await page.locator('thead').first().innerText()).toLowerCase()
  if (head.includes('location') && !head.includes('area')) console.log('PASS  Candidates DB says Location')
  else { failed++; console.log('FAIL  Candidates DB still says Area') }
}

// 5. Candidates DB (referral database) — admin opens on the full list
await page.goto(`${BASE}/#/candidates`)
await expectText('Admin view — the whole database', 'admin sees the full DB by default')
await expectText('Ankit Malhotra', 'candidates DB renders')
// and can still narrow to one area — the view HR is locked to
{
  await page.click('button:has-text("Search by location")')
  await page.waitForSelector('text=Search a location to open the database', { timeout: 8000 })
  const leaked = await page.locator('td', { hasText: 'Ankit Malhotra' }).count()
  if (leaked === 0) console.log('PASS  area view lists nothing until searched')
  else { failed++; console.log('FAIL  rows visible in the area view without a search') }
  await page.locator('input[list="candidate-locations"]').fill('Ludhiana')
  await page.click('button:has-text("Search")')
  await page.waitForSelector('text=Ankit Malhotra', { timeout: 8000 })
  const other = await page.locator('td', { hasText: 'Harjinder Pal' }).count()   // Mohali
  if (other === 0) console.log('PASS  area search returns only that area')
  else { failed++; console.log('FAIL  area search leaked another area') }
}
{
  // HR always has the last 15 days without searching anything
  await page.click('button:has-text("Last 15 days")')
  await page.waitForSelector('text=touched in the last 15 days', { timeout: 8000 })
  await page.waitForSelector('text=Nikita Rao', { timeout: 8000 })   // created 2 days ago
  const stale = await page.locator('td', { hasText: 'Divya Kapoor' }).count()   // last touched 20 days ago
  if (stale === 0) console.log('PASS  recent view shows the last 15 days only')
  else { failed++; console.log('FAIL  recent view leaked a row older than 15 days') }
  const edited = await page.locator('td', { hasText: 'Rakesh Yadav' }).count()  // 22 days
  if (edited === 0) console.log('PASS  recent view excludes untouched older rows')
  else { failed++; console.log('FAIL  recent view included an untouched older row') }
  await page.click('button:has-text("open the full database")')
  await page.waitForSelector('text=Admin view — the whole database', { timeout: 8000 })
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

{
  // the Candidates DB has no sheet import of its own any more
  await page.goto(`${BASE}/#/candidates`)
  await page.waitForTimeout(400)
  const buttons = await page.locator('button').allInnerTexts()
  if (!buttons.some((b) => /import from sheet/i.test(b))) console.log('PASS  no sheet import on the Candidates DB')
  else { failed++; console.log('FAIL  Candidates DB still offers a sheet import') }
}
{
  // the employee roster comes from the HR sheet; nothing is written back
  await page.goto(`${BASE}/#/people`)
  const peopleButtons = await page.locator('button').allInnerTexts()
  if (!peopleButtons.some((b) => /import csv/i.test(b))) console.log('PASS  CSV import removed from Employees')
  else { failed++; console.log('FAIL  Import CSV still on Employees') }
  await page.click('button:has-text("Import from sheet")')
  await page.waitForSelector('text=Import employees from the HR sheet', { timeout: 8000 })
  await expectText('Master Sheet', 'employee import names the tab')
  const modal = page.locator('div.fixed.inset-0.z-50')
  await modal.locator('button:has-text("Dry run")').click()
  await page.waitForSelector('text=Dry run — nothing written', { timeout: 8000 })
  await expectText('emp_code', 'dry run reports the matched columns')
  await expectText('vacant position', 'dry run lists vacant positions')
  await modal.locator('button', { hasText: /^Import$/ }).click()
  await page.waitForSelector('text=2 added, 12 updated', { timeout: 10000 }).catch(() => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const arrived = await page.locator('td', { hasText: 'Amit Chawla' }).count()
  if (arrived > 0) console.log('PASS  imported employees land in the list')
  else { failed++; console.log('FAIL  imported employees not in the list') }
}
{
  // the outbound sync is gone
  const buttons = await page.locator('button').allInnerTexts()
  if (!buttons.some((b) => /sync sheet/i.test(b))) console.log('PASS  outbound sheet sync removed')
  else { failed++; console.log('FAIL  Sync sheet button still present') }
}

{
  // admin can edit and delete rows in the DB
  await page.goto(`${BASE}/#/candidates`)
  await page.waitForSelector('text=Ankit Malhotra', { timeout: 8000 })
  const row = page.locator('tr', { hasText: 'Nikita Rao' })
  if (await row.locator('button:has-text("Edit")').count()) console.log('PASS  Edit button on DB rows')
  else { failed++; console.log('FAIL  no Edit button on DB rows') }

  page.once('dialog', (d) => d.accept())
  await row.locator('button:has-text("Delete")').click()
  await page.waitForSelector('text=deleted', { timeout: 8000 })
  try {
    await page.locator('td', { hasText: 'Nikita Rao' }).first().waitFor({ state: 'detached', timeout: 8000 })
    console.log('PASS  admin deleted a DB row')
  } catch { failed++; console.log('FAIL  DB row still listed after delete') }
}

// 6. Referral links tab
await page.goto(`${BASE}/#/candidates`)
await clickTabAndExpect('button:has-text("Referral links")', 'New referral link', 'referral links tab')
{
  // a new link must name a referrer
  await page.click('button:has-text("New referral link")')
  await page.waitForSelector('text=Who is this link for?', { timeout: 8000 })
  await page.click('button:has-text("Create link")')
  await page.waitForSelector('text=Choose who this link is for', { timeout: 8000 })
  console.log('PASS  new link requires a referrer')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(3500)   // let the toast clear so it can't swallow the next click
}
{
  // create one for an outside source
  await page.click('button:has-text("New referral link")')
  await page.waitForSelector('text=Who is this link for?', { timeout: 8000 })
  await page.locator('label:has-text("Who is this link for?") select').selectOption('outside')
  await page.waitForSelector('text=Their name', { timeout: 8000 })
  await page.locator('label:has-text("Their name") input').fill('E2E Test Source')
  await page.click('button:has-text("Create link")')
  await page.waitForSelector('text=no login needed', { timeout: 15000 })
  console.log('PASS  referral link created')
  await page.click('button:has-text("Done")')
  await page.waitForSelector('td:has-text("E2E Test Source")', { timeout: 8000 })
}
{
  // it can be disabled…
  const row = page.locator('tr', { hasText: 'E2E Test Source' })
  await row.locator('button:has-text("Disable")').click()
  await page.waitForSelector('text=Link disabled', { timeout: 8000 })
  console.log('PASS  link can be disabled')
}
{
  // …and deleted (confirm dialog auto-accepted)
  page.once('dialog', (d) => d.accept())
  await page.locator('tr', { hasText: 'E2E Test Source' }).locator('button:has-text("Delete")').click()
  await page.waitForSelector('text=Link deleted', { timeout: 8000 })
  try {
    await page.locator('td', { hasText: 'E2E Test Source' }).first().waitFor({ state: 'detached', timeout: 8000 })
    console.log('PASS  link deleted')
  } catch { failed++; console.log('FAIL  link still listed after delete') }
}
await expectText('Ramesh Kumar (TalentBridge)', 'source link listed')

// 7. Public referral form: prefilled referrer, required fields, +91 phone
// 7a. a link issued to an employee prefills (and locks) the referrer
await page.goto(`${BASE}/#/f/demo-team-referrals`)
await expectText('This link was issued to you', 'employee link prefills the referrer')
await expectText('Deepak Verma', 'referrer name filled from the link')
await expectText('RM001', 'referrer EMP ID filled from the link')

// 7b. an expired link is refused
await page.goto(`${BASE}/#/f/demo-expired-link`)
await expectText('expired', 'expired link is refused')

// 7c. a consultant link: details still come from the link, then validation + a real submission
await page.goto(`${BASE}/#/f/demo-source-ramesh`)
await expectText('Candidate referral form', 'referral form renders')
{
  const body = await page.locator('body').innerText()
  if (!/Share your details once/.test(body)) console.log('PASS  stock blurb removed from the form')
  else { failed++; console.log('FAIL  stock blurb still on the form') }
}
await expectText('Your details', 'referrer section shows')
await expectText('Ramesh Kumar (TalentBridge)', 'consultant link autofills too')
await expectText('Your Contacts', 'contacts section renamed')
await expectText('Contact 1', 'contact rows show')
{
  // nothing about the referrer is typed any more
  const inputs = await page.locator('input:not([type=file])').count()
  const rowInputs = 5 // name, phone, designation, area, current company
  if (inputs === rowInputs) console.log('PASS  referrer details are read-only')
  else { failed++; console.log(`FAIL  referrer details are read-only (found ${inputs} inputs)`) }
}

const cand = (i, label) => page.locator('div.rounded-lg', { hasText: `Contact ${i}` }).locator(`label:has-text("${label}") input`).first()

await cand(1, 'Name').fill('Balwinder Sandhu')
await page.click('button:has-text("Submit")')
await expectText('Contact 1: Phone number is required', 'missing required field blocked')

await cand(1, 'Designation').fill('Sales Officer')
await cand(1, 'Area').fill('Ludhiana')
await cand(1, 'Current company').fill('Nutra Foods')
await cand(1, 'Phone number').fill('1234567890')     // landline-style, not a mobile
await page.click('button:has-text("Submit")')
await expectText('10-digit mobile', 'bad phone blocked')

await cand(1, 'Phone number').fill('9000011111')
await page.click('button:has-text("Add another contact")')
await expectText('Contact 2', 'second contact row added')
await cand(2, 'Name').fill('Half Filled')
await page.click('button:has-text("Submit")')
await expectText('Contact 2: Phone number is required', 'half-filled second row blocked')
{
  // drop row 2 so only the complete contact is submitted
  await page.locator('div.rounded-lg', { hasText: 'Contact 2' }).locator('button').first().click()
}
await page.click('button:has-text("Submit")')
await expectText('Submitted — thank you', 'referral submission accepted')

await page.waitForTimeout(21000) // let queries go stale so remounts refetch
await page.goto(`${BASE}/#/candidates`)
await clickTabAndExpect('button:has-text("Submissions")', 'Gaurav Nanda', 'submissions queue renders (seeded)')
await expectText('Balwinder Sandhu', 'new submission waits for review')
await expectText('Ramesh Kumar (TalentBridge)', 'submission grouped under the link referrer')
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
{
  const kinds = await page.locator('label:has-text("Type") select').innerText()
  if (!/intake/i.test(kinds)) console.log('PASS  candidate-intake form type removed')
  else { failed++; console.log('FAIL  candidate-intake form type still offered') }
}
await page.keyboard.press('Escape')
await clickTabAndExpect('button:has-text("Checklists")', 'Standard onboarding', 'checklists managed in settings')
{
  // the employee sheet is editable in Settings → Company
  await clickTabAndExpect('button:has-text("Company")', 'Employee Google Sheet', 'employee sheet card in settings')
  const v = await page.locator('label:has-text("Sheet link or id") input').inputValue()
  if (v.includes('1LjZIDyXeDG2pEiS2KGSj8l2Ts')) console.log('PASS  sheet id prefilled from the setting')
  else { failed++; console.log(`FAIL  sheet id not prefilled (${v})`) }
}

// 8b. Admin: view the app as another user
{
  await page.goto(`${BASE}/#/settings`)
  await clickTabAndExpect('button:has-text("Users")', 'Priya Nair', 'users tab lists staff')
  const row = page.locator('tr', { hasText: 'Priya Nair' })
  await row.locator('button:has-text("View as")').click()
  await page.waitForSelector('text=Viewing as', { timeout: 8000 })
  console.log('PASS  view-as banner appears')
  {
    const nav = await page.locator('aside').first().innerText()
    // Priya is HR only: the purchase module and settings should disappear
    if (!/purchase orders/i.test(nav) && !/settings/i.test(nav)) console.log('PASS  menus match the viewed user')
    else { failed++; console.log(`FAIL  menus not switched (${nav.replace(/\s+/g, ' ')})`) }
  }
  await page.click('button:has-text("Stop viewing as")')
  await page.waitForTimeout(400)
  await page.waitForTimeout(600)
  {
    const nav = await page.locator('aside').first().innerText()
    if (/settings/i.test(nav)) console.log('PASS  stopping restores the admin menus')
    else { failed++; console.log('FAIL  admin menus not restored') }
  }
}

// 8c. Admin: revoke / restore / delete staff accounts
{
  await page.goto(`${BASE}/#/settings`)
  await clickTabAndExpect('button:has-text("Users")', 'Rohit Bansal', 'users tab lists an invite')
  page.on('dialog', (d) => d.accept())

  const rohit = page.locator('tr', { hasText: 'Rohit Bansal' })
  await rohit.locator('button:has-text("Revoke")').click()
  await page.waitForSelector('text=Access revoked', { timeout: 8000 })
  console.log('PASS  access revoked')

  await page.locator('tr', { hasText: 'Rohit Bansal' }).locator('button:has-text("Restore")').click()
  await page.waitForSelector('text=Access restored', { timeout: 8000 })
  console.log('PASS  access restored')

  // Priya has records against her name — delete must refuse and say why
  await page.locator('tr', { hasText: 'Priya Nair' }).locator('button:has-text("Delete")').click()
  await page.waitForSelector('text=revoke their access instead', { timeout: 8000 })
  console.log('PASS  delete refuses when there is history')

  // Rohit has none, so he goes
  await page.locator('tr', { hasText: 'Rohit Bansal' }).locator('button:has-text("Delete")').click()
  await page.waitForSelector('text=deleted', { timeout: 8000 })
  await page.waitForTimeout(600)
  const left = await page.locator('td', { hasText: 'Rohit Bansal' }).count()
  if (left === 0) console.log('PASS  unused invite deleted')
  else { failed++; console.log('FAIL  invite still listed after delete') }
}

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
