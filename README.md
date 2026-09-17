# Makams Ops

Internal operations app for Makams — HR and Purchase.

**HR** (sales department only): the sales-force employee database built on the same
users framework as the learnapp (Employee ID = learnapp login, level Sales/ASM/RSM/HO,
HQ + ASM/RSM hierarchy), a **Prospectives** sheet (the active hiring pipeline: Name,
Designation, Area, Contact, Status with filters), a **Candidates DB** filled through
shareable referral links (referrer enters their details once, then multiple candidates
in a table; every row lands tagged with Referred-by + EMP ID), one-click push from the
DB to Prospectives, onboarding/exit checklists, one-way sync **to** the employee Google
Sheet, and learnapp account management (create login = Employee ID + password,
disable/enable on exit).

**Admin**: manages users/roles, the jotform-style **form builder** (candidate-intake
and general forms), checklist templates, PO types/locations/approval rules, and company
settings. HR and Purchase roles each see only their own module.

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
     `0003_purchase.sql`, … through `0010_referral_rules.sql` **in order** (or paste the
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
| `public-form` | Receives form submissions (candidate intake etc.) from `/f/:token` pages | — |
| `sync-sheet` | Overwrites the employee tab in your Google Sheet from the app | `GOOGLE_SERVICE_ACCOUNT`, `SHEET_ID`, `SHEET_TAB` |
| `learnapp-admin` | Creates/disables learnapp accounts (Employee-ID login) | `LEARNAPP_URL`, `LEARNAPP_SERVICE_ROLE_KEY`, `LEARNAPP_EMAIL_DOMAIN` (optional) |

Deploy (needs the [Supabase CLI](https://supabase.com/docs/guides/cli), logged in and linked):

```bash
supabase functions deploy send-po
supabase functions deploy sync-sheet
supabase functions deploy learnapp-admin
supabase functions deploy public-form --no-verify-jwt   # public by design; every request is validated against the link token
```

Set the secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set PO_FROM_EMAIL="Makams Purchase <purchase@makams.com>"
supabase secrets set GOOGLE_SERVICE_ACCOUNT="$(cat service-account.json)"
supabase secrets set SHEET_ID=1AbC...xyz        # from the sheet URL
supabase secrets set SHEET_TAB=Employees        # tab that gets overwritten
supabase secrets set LEARNAPP_URL=https://<learnapp-ref>.supabase.co
supabase secrets set LEARNAPP_SERVICE_ROLE_KEY=eyJ...
```

Each integration fails with a clear "not configured yet" message until its secrets are
set — you can go live without them and add them later.

### Google Sheet sync (details)

- In the same GCP project: **enable the Google Sheets API**, create a **service
  account**, download its JSON key → that JSON (whole file) is the
  `GOOGLE_SERVICE_ACCOUNT` secret.
- Share the employee spreadsheet with the service account's `client_email` as
  **Editor**.
- **Direction**: this app is the source of truth. Every save in the app pushes the full
  list to the tab (`SHEET_TAB` is cleared and rewritten). Point it at a dedicated tab —
  don't hand-edit that tab, edits there will be overwritten. Do the one-time import the
  other way with People → Import CSV.

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
4. **People → Import CSV**: import the current employee sheet (export it as CSV first).
   Rows with a matching employee code update instead of duplicating.
5. Hit **Sync sheet** once and check the tab was written.

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
  Contact, Status (New → Contacted → Interested → Interview Scheduled → Offer Letter
  Sent → Joined, plus Rejected), with status/area filters and inline status changes.
- **Candidates DB & referral links**: the raw referral pool. HR creates one link per
  source (Candidates DB → Referral links) and can **issue a link to a specific
  employee** — their name and EMP ID are then filled in and locked on the form, so the
  referrer only adds candidates. Every link **expires 7 days** after it is created.
  The public form takes the referrer's details once, then a table of candidates where
  **name, phone, designation, area and current company are all required**, and phone
  must be an Indian mobile — it is stored canonically as `+91XXXXXXXXXX` (validated in
  the browser *and* in the edge function). Submitted rows land in a **review queue**
  (Candidates → Submissions tab), where HR edits each entry and approves it into the
  DB (or rejects it) — nothing enters the Candidates DB unreviewed. HR comments are
  edited inline in the table, and good candidates go to Prospectives with one click.
  Nothing here auto-creates employees.
- **Candidate DB access**: the database cannot be browsed or exported in bulk. HR
  searches an **area** and gets only the rows for that area; admins can deliberately
  open the full list. This is enforced by RLS — the `candidates` table has no SELECT
  policy for HR at all, reads go through `search_candidates(area)`, and writes go
  through `save_candidate` / `pick_candidate` / `delete_candidate`. An HR user with
  the anon key and a REST client sees exactly what the UI shows them: nothing, until
  they name an area.
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
