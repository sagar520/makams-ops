import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Loader2, Upload, Plus, X } from 'lucide-react'
import { supabase, functionsUrl, supabaseAnonKey, isDemo, callFunction } from '../../lib/supabase'
import { Button, Input, Textarea, Select, Field, cx } from '../../components/ui'
import { isMobile, normalizeMobile, mobileInput, MOBILE_HINT } from '../../lib/phone'

async function postForm(token, answers, files = {}) {
  if (isDemo) {
    await callFunction('public-form', { token, answers, files })
    return
  }
  const fd = new FormData()
  fd.append('token', token)
  fd.append('answers', JSON.stringify(answers))
  for (const [key, file] of Object.entries(files)) fd.append(`file_${key}`, file)
  const res = await fetch(`${functionsUrl}/public-form`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
    body: fd,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) throw new Error(json.error || 'Something went wrong — please try again')
}

export default function FormPage() {
  const { token } = useParams()
  const [info, setInfo] = useState(undefined)
  const [values, setValues] = useState({})
  const [files, setFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('form_link_info', { p_token: token }).then(({ data, error }) => {
      setInfo(error ? { ok: false, reason: 'invalid' } : data)
    })
  }, [token])

  const fields = info?.form?.fields || []

  const submit = async () => {
    setError(null)
    for (const f of fields) {
      if (!f.required) continue
      if (f.type === 'file' ? !files[f.key] : !String(values[f.key] ?? '').trim()) {
        return setError(`"${f.label}" is required`)
      }
    }
    setSubmitting(true)
    try {
      await postForm(token, values, files)
      setDone(true)
      window.scrollTo(0, 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (info === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!info.ok) {
    const messages = {
      invalid: 'This link is not valid. Please check with your contact at Makams.',
      expired: 'This link has expired. Please ask for a fresh one.',
      revoked: 'This link is no longer accepting responses.',
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-amber-400" />
          <p className="text-sm text-slate-600">{messages[info.reason] || messages.invalid}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-900">Submitted — thank you!</h1>
          <p className="mt-2 text-sm text-slate-500">The {info.company} team has received it.</p>
          <Button variant="secondary" className="mt-5" onClick={() => { setDone(false); setValues({}); setFiles({}) }}>
            Submit another
          </Button>
        </div>
      </div>
    )
  }

  if (info.form.kind === 'referral') {
    return <ReferralForm token={token} info={info} onDone={() => { setDone(true); window.scrollTo(0, 0) }} />
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="bg-indigo-600 pb-16 pt-10 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">{info.company}</p>
        <h1 className="mt-1 px-4 text-xl font-semibold">{info.form.name}</h1>
        {info.form.description && <p className="mx-auto mt-1 max-w-md px-6 text-sm text-indigo-100">{info.form.description}</p>}
      </div>

      <div className="mx-auto -mt-10 w-full max-w-lg space-y-4 px-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>}

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.type === 'textarea' ? (
                <Textarea rows={3} value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              ) : f.type === 'select' ? (
                <Select value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                  <option value="">Select…</option>
                  {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : f.type === 'file' ? (
                <label className={cx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm transition-colors',
                  files[f.key] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/30'
                )}>
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{files[f.key]?.name || 'Choose file (PDF / Word / image, max 15 MB)'}</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (file.size > 15 * 1024 * 1024) return setError('File is too large (max 15 MB)')
                      setFiles((x) => ({ ...x, [f.key]: file }))
                    }} />
                </label>
              ) : (
                <Input
                  type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <Button className="w-full" loading={submitting} onClick={submit}>Submit</Button>
        </div>

        <p className="pt-2 text-center text-xs text-slate-400">
          Shared with {info.source_name} · Powered by {info.company} Ops
        </p>
      </div>
    </div>
  )
}

/* ---------------- referral form: your details + a table of candidates ---------------- */

let rowKey = 0
const emptyRow = () => ({ key: ++rowKey, name: '', designation: '', area: '', current_company: '', phone: '' })

function ReferralForm({ token, info, onDone }) {
  const linked = info.referrer || {}
  const locked = !!linked.locked          // the link knows who the referrer is
  const [referrer, setReferrer] = useState({
    name: linked.name || '',
    emp_id: linked.emp_id || '',
    phone: mobileInput(linked.phone || ''),
  })
  const [rows, setRows] = useState([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const setRef = (k) => (e) => setReferrer((r) => ({ ...r, [k]: k === 'phone' ? mobileInput(e.target.value) : e.target.value }))
  const setRow = (key, k, v) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [k]: k === 'phone' ? mobileInput(v) : v } : r)))

  const REQUIRED = [
    ['name', 'Name'],
    ['phone', 'Phone number'],
    ['designation', 'Designation'],
    ['area', 'Area'],
    ['current_company', 'Current company'],
  ]

  // a row counts as "started" once anything is typed in it
  const started = (r) => REQUIRED.some(([k]) => String(r[k] || '').trim())

  const submit = async () => {
    setError(null)
    if (!referrer.name.trim()) return setError('Please enter your name')

    const filled = rows.filter(started)
    if (!filled.length) return setError('Add at least one contact')

    for (let i = 0; i < filled.length; i++) {
      const r = filled[i]
      for (const [k, label] of REQUIRED) {
        if (!String(r[k] || '').trim()) return setError(`Contact ${i + 1}: ${label} is required`)
      }
      if (!isMobile(r.phone)) return setError(`Contact ${i + 1}: phone must be a ${MOBILE_HINT}`)
    }

    setSubmitting(true)
    try {
      await postForm(token, {
        referrer: {
          name: referrer.name.trim(),
          emp_id: referrer.emp_id.trim() || null,
          phone: normalizeMobile(referrer.phone),
        },
        candidates: filled.map(({ key, ...r }) => ({
          ...r,
          name: r.name.trim(),
          designation: r.designation.trim(),
          area: r.area.trim(),
          current_company: r.current_company.trim(),
          phone: normalizeMobile(r.phone),
        })),
      })
      onDone()
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  const readyCount = rows.filter((r) => REQUIRED.every(([k]) => String(r[k] || '').trim()) && isMobile(r.phone)).length

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="bg-indigo-600 pb-16 pt-10 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">{info.company}</p>
        <h1 className="mt-1 px-4 text-xl font-semibold">{info.form.name}</h1>
        {info.form.description && <p className="mx-auto mt-1 max-w-md px-6 text-sm text-indigo-100">{info.form.description}</p>}
      </div>

      <div className="mx-auto -mt-10 w-full max-w-2xl space-y-4 px-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Your details</h2>
          {locked ? (
            <>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Name</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">{referrer.name}</dd>
                </div>
                {referrer.emp_id && (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Employee ID</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">{referrer.emp_id}</dd>
                  </div>
                )}
                {referrer.phone && (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Phone</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">+91 {referrer.phone.slice(0, 5)} {referrer.phone.slice(5)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                This link was issued to you, so your details are filled in already. Not you?
                Ask HR for your own link.
              </p>
            </>
          ) : (
            // older links created before referrers were attached
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your name" required><Input value={referrer.name} onChange={setRef('name')} /></Field>
              <Field label="Employee ID" hint="If you work at Makams"><Input value={referrer.emp_id} onChange={setRef('emp_id')} placeholder="e.g. SALES001" /></Field>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Your Contacts</h2>
            <p className="text-xs text-slate-400">Add as many as you like — every field is required for each contact.</p>
          </div>
          <div className="space-y-3 p-4">
            {rows.map((r, i) => (
              <div key={r.key} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact {i + 1}</p>
                  {rows.length > 1 && (
                    <button className="text-slate-300 hover:text-red-500" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name" required><Input className="bg-white" value={r.name} onChange={(e) => setRow(r.key, 'name', e.target.value)} /></Field>
                  <Field label="Phone number" required hint={MOBILE_HINT}>
                    <PhoneInput className="bg-white" value={r.phone} onChange={(e) => setRow(r.key, 'phone', e.target.value)} />
                  </Field>
                  <Field label="Designation" required><Input className="bg-white" value={r.designation} onChange={(e) => setRow(r.key, 'designation', e.target.value)} /></Field>
                  <Field label="Area" required><Input className="bg-white" value={r.area} onChange={(e) => setRow(r.key, 'area', e.target.value)} placeholder="e.g. Ludhiana" /></Field>
                  <Field label="Current company" required className="sm:col-span-2"><Input className="bg-white" value={r.current_company} onChange={(e) => setRow(r.key, 'current_company', e.target.value)} /></Field>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setRows((rs) => [...rs, emptyRow()])}>Add another contact</Button>
            <Button className="w-full" loading={submitting} onClick={submit}>
              Submit {readyCount || ''} contact{readyCount === 1 ? '' : 's'}
            </Button>
          </div>
        </div>

        <p className="pt-2 text-center text-xs text-slate-400">
          Shared with {info.source_name} · Powered by {info.company} Ops
        </p>
      </div>
    </div>
  )
}

/** Text field with a fixed +91 prefix — only the 10 digits are typed. */
function PhoneInput({ value, onChange, className }) {
  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-2.5 text-sm text-slate-500">+91</span>
      <Input className={cx('rounded-l-none', className)} inputMode="numeric" placeholder="98765 43210" value={value} onChange={onChange} />
    </div>
  )
}
