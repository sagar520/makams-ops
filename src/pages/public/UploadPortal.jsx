import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Upload, FileText, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase, functionsUrl, supabaseAnonKey } from '../../lib/supabase'
import { docTypeLabel, PROFILE_FIELDS, profileFieldLabel } from '../../lib/constants'
import { Button, Input, Textarea, Field, cx } from '../../components/ui'

export default function UploadPortal() {
  const { token } = useParams()
  const [info, setInfo] = useState(undefined) // undefined loading
  const [fields, setFields] = useState({})
  const [savingFields, setSavingFields] = useState(false)
  const [fieldsSaved, setFieldsSaved] = useState(false)
  const [uploadingType, setUploadingType] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    const { data, error } = await supabase.rpc('upload_link_info', { p_token: token })
    if (error) return setInfo({ ok: false, reason: 'invalid' })
    setInfo(data)
    if (data?.ok) {
      const vals = {}
      for (const f of data.profile_fields || []) vals[f] = data.profile_values?.[f] ?? ''
      setFields(vals)
    }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFile = async (docType, file) => {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) return setError('File is too large (max 15 MB)')
    setError(null)
    setUploadingType(docType)
    try {
      const fd = new FormData()
      fd.append('token', token)
      fd.append('doc_type', docType)
      fd.append('file', file)
      const res = await fetch(`${functionsUrl}/public-upload`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: fd,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed — please try again')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploadingType(null)
    }
  }

  const saveFields = async () => {
    setSavingFields(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('submit_link_profile', { p_token: token, p_fields: fields })
      if (error || !data?.ok) throw new Error(error?.message || 'Could not save — please try again')
      setFieldsSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingFields(false)
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
      invalid: 'This link is not valid. Please check with HR for a fresh link.',
      expired: 'This link has expired. Please ask HR to send you a new one.',
      revoked: 'This link is no longer active. Please contact HR.',
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

  const docs = info.doc_types || []
  const profileFieldList = (info.profile_fields || []).filter((f) => PROFILE_FIELDS.some((p) => p.value === f))
  const allDocsDone = docs.length > 0 && docs.every((d) => d.uploaded)

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="bg-indigo-600 pb-16 pt-10 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">{info.company}</p>
        <h1 className="mt-1 px-4 text-xl font-semibold">Hi {info.person_name?.split(' ')[0]} 👋</h1>
        <p className="mt-1 px-6 text-sm text-indigo-100">Please complete the items below. No login needed.</p>
      </div>

      <div className="mx-auto -mt-10 w-full max-w-lg space-y-4 px-4">
        {info.message && (
          <div className="rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-600 shadow-sm">{info.message}</div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>
        )}

        {docs.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Documents {allDocsDone && <span className="ml-1 text-emerald-600">— all done ✓</span>}</h2>
              <p className="text-xs text-slate-400">PDF or photo, up to 15 MB each</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => (
                <li key={d.doc_type} className="flex items-center gap-3 px-4 py-3.5">
                  {d.uploaded
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    : <FileText className="h-5 w-5 shrink-0 text-slate-300" />}
                  <span className={cx('flex-1 text-sm', d.uploaded ? 'text-slate-400' : 'text-slate-700')}>{docTypeLabel(d.doc_type)}</span>
                  <label className={cx(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                    d.uploaded ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}>
                    {uploadingType === d.doc_type
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />}
                    {d.uploaded ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                      disabled={uploadingType !== null}
                      onChange={(e) => { uploadFile(d.doc_type, e.target.files?.[0]); e.target.value = '' }}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {profileFieldList.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Your details</h2>
              <p className="text-xs text-slate-400">Check what's there and fill in the blanks</p>
            </div>
            <div className="space-y-4 p-4">
              {profileFieldList.map((f) => {
                const meta = PROFILE_FIELDS.find((p) => p.value === f)
                return (
                  <Field key={f} label={profileFieldLabel(f)}>
                    {f === 'address' ? (
                      <Textarea rows={2} value={fields[f] ?? ''} onChange={(e) => setFields((x) => ({ ...x, [f]: e.target.value }))} />
                    ) : (
                      <Input
                        type={meta?.type === 'date' ? 'date' : 'text'}
                        value={fields[f] ?? ''}
                        onChange={(e) => setFields((x) => ({ ...x, [f]: e.target.value }))}
                      />
                    )}
                  </Field>
                )
              })}
              <Button className="w-full" loading={savingFields} onClick={saveFields}>
                {fieldsSaved ? 'Saved ✓ — submit again if you change anything' : 'Submit details'}
              </Button>
            </div>
          </div>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Sent by {info.company} HR · Link expires {new Date(info.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </p>
      </div>
    </div>
  )
}
