# Makams Ops

Internal operations app for Makams — HR and Purchase.

**HR** (sales department only): the sales-force employee database built on the same
users framework as the learnapp (Employee ID = learnapp login, level Sales/ASM/RSM/HO,
HQ + ASM/RSM hierarchy), a **Prospectives** sheet (the active hiring pipeline: Name,
Designation, Area, Contact, Status with filters), a **Candidates DB** filled through
shareable referral links (referrer enters their details once, then multiple candidates
in a table; every row lands tagged with Referred-by + EMP ID), one-click push from the
DB to Prospectives, onboarding/exit checklists, the employee roster imported **from** the HR Google
Sheet, and learnapp account management (create login = Employee ID + password,
disable/enable on exit).

**Admin**: manages users/roles, the jotform-style **form builder** (referral and
general forms), checklist templates, PO types/locations/approval rules, and company
settings. HR and Purchase roles each see only their own module. Settings → Users also
offers **View as** (see the app with another person's menus — interface only, queries
still run as you), **Revoke / Restore** access, and **Delete** for invites and mistakes
(refused when there is history behind the account, so authorship is never orphaned).

**Purchase**: vendors, purchase orders with a configurable approval matrix
(rules on PO type / delivery location / amount → ordered approver chain), PO PDF
generation, emailing POs to vendors with resend + send log, goods receipts (partial /
full), duplicate PO.

Stack: React 18 + Vite 6 + Tailwind 4 + TanStack Query 5 + Supabase (Postgres/RLS/Edge
Functions/Storage) + Vercel. Same stack as the learnapp, but its **own** Supabase project.

---

## 0. Try it without any setup (demo mode)

```bash
npm install
VITE_DEMO=1 npm run dev
```

Demo mode runs the **entire app against an in-memory sample dataset** — no Supabase
project, no env vars, no cost. Every flow works: create/submit/approve/reject POs,
record receipts, duplicate, PO PDFs, the Prospectives sheet, referral links and the
public referral form, checklists, learnapp actions (simulated). Changes live only in the tab and
reset on refresh. `VITE_DEMO=1 npm run build` produces a static demo build you can host
anywhere.

Never set `VITE_DEMO` on the real deployment.

---

## 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → New project (free tier is fine; the free plan
   allows 2 active projects, so the learnapp and this can co-exist).
2. **Before running migrations**: open `supabase/migrations/0004_seed.sql` and check the
   first-admin email (currently `sagar@makams.com`) — that account becomes admin on
   first sign-in.
3. Run the migrations, either way:
   - **Dashboard**: SQL Editor → paste and run `0001_core.sql`, `0002_hr.sql`,
     `0003_purchase.sql`, … through `0018_candidate_admin_ops.sql` **in order** (or paste the
     combined `supabase/makams-ops-schema.sql` once).
   - **CLI**: `supabase link --project-ref <ref>` then `supabase db push`.

The migrations create all tables, RLS policies, RPCs, the private `employee-docs`
storage bucket, and seed data (PO types, onboarding/exit checklist templates, company
settings placeholder).

## 2. Google sign-in (staff login)

Staff access is invite-only: someone can sign in with Google only if their email exists
under Settings → Users.

1. [console.cloud.google.com](https://console.cloud.google.com) → create/reuse a project
   (you'll also use it for the Sheets service account).
2. **APIs & Services → OAuth consent screen**: Internal (if makams.com is on Google
   Workspace) or External + your users.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase Dashboard → **Authentication → Providers → Google**: paste client ID +
   secret, enable.
5. Supabase → **Authentication → URL Configuration**: set Site URL to your Vercel URL
   (e.g. `https://ops.makams.com` or `https://makams-ops.vercel.app`) and add
   `http://localhost:5173` to Additional Redirect URLs for local dev.

## 3. Frontend

```bash
cp .env.example .env        # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                 # http://localhost:5173
```

Sign in with the seeded admin email → you land on the dashboard.

## 4. Edge functions

Four functions live in `supabase/functions/`:

| Function | Purpose | Secrets it needs |
|---|---|---|
| `send-po` | Emails the PO PDF to vendors via Resend, logs sends | `RESEND_API_KEY`, `PO_FROM_EMAIL` |
| `public-form` | Receives referral-form submissions from `/f/:token` pages | — |
| `import-employees` | Pulls the employee roster **from** the HR Google Sheet | `GOOGLE_SERVICE_ACCOUNT` |
| `learnapp-admin` | Creates/disables learnapp accounts (Employee-ID login) | `LEARNAPP_URL`, `LEARNAPP_SERVICE_ROLE_KEY`, `LEARNAPP_EMAIL_DOMAIN` (optional) |

Deploy (needs the [Supabase CLI](https://supabase.com/docs/guides/cli), logged in and linked):

```bash
supabase functions deploy send-po
supabase functions deploy import-employees
supabase functions deploy learnapp-admin
supabase functions deploy public-form --no-verify-jwt   # public by design; every request is validated against the link token
```

Set the secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set PO_FROM_EMAIL="Makams Purchase <purchase@makams.com>"
supabase secrets set GOOGLE_SERVICE_ACCOUNT="$(cat service-account.json)"
supabase secrets set LEARNAPP_URL=https://<learnapp-ref>.supabase.co
supabase secrets set LEARNAPP_SERVICE_ROLE_KEY=eyJ...
```

Each integration fails with a clear "not configured yet" message until its secrets are
set — you can go live without them and add them later.

### Employee Google Sheet (details)

- In the same GCP project: **enable the Google Sheets API**, create a **service
  account**, download its JSON key → that JSON (whole file) is the
  `GOOGLE_SERVICE_ACCOUNT` secret. Keep the file outside this repo.
- Share the roster spreadsheet with the service account's `client_email`. **Viewer is
  enough** — the app never writes to it.
- **Direction**: the sheet is the source of truth. Employees → *Import from sheet* reads
  the `Master Sheet` tab and brings it in; there is no outbound sync, so nothing the app
  does can overwrite your roster.
- Columns are matched by header name, so the sheet needs no particular layout. Recognised:
  HQ Name, ASM Name, RSM Name, SBU Head, EmpCode, Name, Email, Mobile, DOJ,
  Active/Inactive (plus common variants of each).
- **HQ Name is read as "Designation Location"** — `VSO Ludhiana` becomes designation VSO,
  location Ludhiana, level Sales Rep. The prefix sets the level: `VSO`/`ASO` → Sales Rep,
  `ASM`/`DRSM` → Sales Manager, `RSM`/`AGM` → Regional Manager. An unrecognised prefix is
  left whole as the location and the level is not touched; the import result lists any
  prefixes it didn't know.
- **The app reads the sheet by itself.** Opening Employees triggers a sync, throttled
  server-side to at most once an hour, and the page says when it last read the sheet and
  what changed. The Import button is still there for a dry run or an immediate re-read.
  `supabase/optional-nightly-sync.sql` adds a 02:30 IST cron run if you want the roster
  current even when nobody logs in.
- A row whose **Name is "Vacant"** is an open position, not a person: it is never
  imported and never reaches the Candidates DB. The import result lists the vacant
  designation + location so you can see where to hire.
- People are matched on **EmpCode** first, then mobile, then name — so importing again
  updates instead of duplicating. A blank cell leaves the app's existing value alone
  rather than wiping it. **Dry run** reports what would change without writing.
- **Employees are read-only in the app.** There is no add, no edit, and clicking a row
  does nothing: every change is made in the sheet and arrives on the next sync. (The
  person page — documents, checklists, learnapp account — is still there at
  `/people/:id` for those app-only features.)
- Which sheet and tab is a setting, not a secret: `app_settings.employee_sheet`
  (`{ "sheet_id": "...", "tab": "Master Sheet" }`).

### Resend (PO emails)

- [resend.com](https://resend.com) → verify the `makams.com` domain (SPF + DKIM DNS
  records) → create an API key. The free tier (3,000 emails/month, 100/day) is far more
  than PO volume needs.
- Until the domain is verified you can only send to your own inbox — verify before
  going live.

### Learnapp (details)

- `LEARNAPP_SERVICE_ROLE_KEY` is the learnapp project's service_role key (Dashboard →
  Settings → API). It stays server-side in the edge function; the browser never sees it.
- Account creation mirrors the learnapp's own `create-user` function: login is the
  Employee ID, the auth email is synthesized as `<empid>@<LEARNAPP_EMAIL_DOMAIN>`
  (default `example.com` — must match `EMAIL_DOMAIN` in the learnapp's
  `src/supabase.js`), and a matching row is inserted into the learnapp `profiles`
  table with role `sales`. HR gets a one-time password to share; disable/enable also
  flips `profiles.active` there.

## 5. Deploy on Vercel

1. Push this repo to GitHub, import it in Vercel (framework: Vite — auto-detected).
2. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. `vercel.json` already rewrites all routes to `index.html` (SPA routing, including
   the public `/f/:token` referral pages).
4. After the first deploy, put the final URL in Supabase Auth → URL Configuration
   (Site URL), or Google sign-in will bounce back to localhost.

## 6. First-run checklist (in the app)

1. **Settings → Company**: name, address, state, GSTIN, PO prefix, default PO terms
   (all appear on the PO PDF; state drives the CGST+SGST vs IGST suggestion).
2. **Settings → Users**: invite HR / purchase / approver users with roles.
3. **Settings → Purchase setup**: check PO types, add delivery locations (with states),
   and create at least one **approval rule** — POs cannot be submitted until a rule
   matches them. A sensible start: one catch-all rule (any type, any location, any
   amount) with you as the single approver; refine later.
4. **Employees**: opening the page syncs the roster from the HR Google Sheet. Use
   Import from sheet → Dry run first if you want to see what it will do.

## 7. How the pieces work

- **Roles**: `admin` (everything), `hr`, `purchase`, `approver`. Admin implies the
  others. RLS enforces module separation in the database, not just the UI — HR users
  cannot read PO tables, purchase users cannot read employee data.
- **PO lifecycle**: draft → submit (number assigned: `PREFIX/26-27/0001`, resets each
  Indian FY; matching rule instantiates the approver chain) → each approver acts in
  order (any rejection → rejected; reopen returns it to draft, keeping the number) →
  approved → send/resend PDF by email (logged) → record receipts (partial/full
  tracked per line) → close. Duplicate works from any status and creates a fresh draft.
  All state transitions run through SECURITY DEFINER RPCs — the client can only edit
  drafts.
- **Employee document requests** (send-a-link uploads) are currently switched off in
  the UI by request; the backend for them remains in place if wanted later. HR can
  still upload documents directly on a person's Documents tab.
- **Prospectives**: the flat hiring sheet HR works daily — Name, Designation, Area,
  Department (Sales / PMT / Marketing / Doctor / Other HO Functions / Other), Contact,
  Source (LI / Indeed, Internal Referral, Other), Status and Last updated.
  Status is colour-coded and changed inline (New → Contacted → Interested → Interview
  Scheduled → Offer Letter Sent → Joined, plus Rejected), with status/area/source
  filters. Each row can carry an optional **resume** (private
  `prospective-resumes` bucket, HR-only, opened through a short-lived signed URL).
- **Candidates DB & referral links**: the raw referral pool. Every link is **issued to
  someone** — an employee picked from the roster, or a named outside source (consultant,
  campus cell). Their name, EMP ID and phone come from the link, so the form shows the
  referrer's details read-only and they only fill in **Your Contacts**. HR can disable
  or delete a link at any time; submissions already received are kept. Every link
  **expires 7 days** after it is created.
  The public form takes the referrer's details once, then a table of candidates where
  **name, phone, designation, area and current company are all required**, and phone
  must be an Indian mobile — it is stored canonically as `+91XXXXXXXXXX` (validated in
  the browser *and* in the edge function). Submitted rows land in a **review queue**
  (Candidates → Submissions tab), where HR edits each entry and approves it into the
  DB (or rejects it) — nothing enters the Candidates DB unreviewed. HR comments are
  edited inline in the table, and good candidates go to Prospectives with one click.
  Nothing here auto-creates employees.
- **Candidate DB access**: HR cannot browse or export the pool. Two doors, and only two:
  everything **added or edited in the last 15 days** (the live working set, shown by
  default), and whatever **location** they search. Admins always open on the full
  database, and can switch to either narrower view. This is enforced by RLS — the
  `candidates` table has no SELECT policy for HR at all, reads go through
  `recent_candidates(days)` and `search_candidates(area)`, and writes go through
  `save_candidate` / `pick_candidate` / `delete_candidate`. The day window is capped at
  15 inside the function, so passing a bigger number does not widen it. An HR user with
  the anon key and a REST client sees exactly what the UI shows them: the last 15 days,
  and nothing older until they name a location.
- **Where candidates come from**: referral links, plus automatic mirroring. Every new
  **employee**, and every new **Sales** prospective, is copied into the Candidates DB
  tagged `Referred by: CRIL HR` — employees also carry `Current company: CRIL`, while
  prospectives leave it blank, since they don't work there yet — so the DB is the one place
  that knows about everybody. Nothing is duplicated — a matching phone (last 10 digits)
  or an identical name means the row is left alone — and rows pushed the other way
  (Candidates → Prospectives) don't come back round. Prospectives outside Sales (PMT,
  Marketing, Doctor, Other HO Functions, Other) stay out of the DB. Mirroring applies
  from the moment the upgrade runs; it does not back-fill what is already there. The old candidate-intake form is
 The old candidate-intake form is
  gone, and the Google Sheet feeds **Employees**, not candidates.
- **Forms**: admin-only builder, jotform-style — add fields (text, paragraph, email,
  phone, number, date, dropdown, file), mark required, reorder, live preview.
  Candidate-intake forms map fields into the candidate database; general forms just
  collect responses (viewable per form).
- **Checklists**: templates are managed by admin (Settings → Checklists); HR starts
  them per-person from the person's Checklists tab; auto-complete when every item is
  done/NA.

## 8. Costs

₹0/month at current scale: Supabase free tier + Vercel Hobby + Resend free tier.

**If your Supabase account already has a paid (Pro) organization**: don't create this
project inside it — every additional project in a Pro org runs its own compute
(~$10/month). Supabase bills per *organization*, so create a **new free-tier
organization** on the same account and put this project there: 2 free projects, 500 MB
DB, free edge functions. Free projects pause after ~7 idle days; daily ops use keeps
this one alive, and unpausing after a long break is one click with no data loss.
