import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Loader2, Upload } from 'lucide-react'
import { supabase, functionsUrl, supabaseAnonKey, isDemo, callFunction } from '../../lib/supabase'
import { Button, Input, Textarea, Select, Field, cx } from '../../components/ui'

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
      if (isDemo) {
        await callFunction('public-form', { token, answers: values, files })
      } else {
        const fd = new FormData()
        fd.append('token', token)
        fd.append('answers', JSON.stringify(values))
        for (const [key, file] of Object.entries(files)) fd.append(`file_${key}`, file)
        const res = await fetch(`${functionsUrl}/public-form`, {
          method: 'POST',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
          body: fd,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json.error) throw new Error(json.error || 'Something went wrong — please try again')
      }
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
