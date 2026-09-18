import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Papa from 'papaparse'
import { Upload, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Button, Select, Table, Th, Td, Tr, Badge, useToast } from '../../components/ui'

const TARGETS = [
  { value: '', label: '— skip —' },
  { value: 'full_name', label: 'Full name', aliases: ['name', 'fullname', 'employeename', 'empname'] },
  { value: 'emp_code', label: 'Employee code', aliases: ['empcode', 'employeeid', 'empid', 'code', 'id'] },
  { value: 'status', label: 'Status', aliases: ['status', 'employmentstatus'] },
  { value: 'sales_role', label: 'Level (Sales/ASM/RSM/HO)', aliases: ['level', 'role', 'designation', 'position'] },
  { value: 'hq_name', label: 'HQ', aliases: ['hq', 'hqname', 'headquarter', 'headquarters', 'territory', 'location', 'branch'] },
  { value: 'asm_name', label: 'ASM name', aliases: ['asm', 'asmname', 'areasalesmanager'] },
  { value: 'rsm_name', label: 'RSM name', aliases: ['rsm', 'rsmname', 'regionalsalesmanager'] },
  { value: 'employment_type', label: 'Employment type', aliases: ['employmenttype', 'type'] },
  { value: 'date_of_join', label: 'Date of joining', aliases: ['doj', 'dateofjoining', 'joiningdate', 'joined'] },
  { value: 'date_of_exit', label: 'Date of exit', aliases: ['doe', 'dateofexit', 'exitdate', 'lwd', 'lastworkingday'] },
  { value: 'personal_email', label: 'Personal email', aliases: ['email', 'personalemail', 'emailid'] },
  { value: 'work_email', label: 'Work email', aliases: ['workemail', 'officialemail', 'companyemail'] },
  { value: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'mobileno', 'contact', 'contactno', 'phonenumber'] },
  { value: 'alt_phone', label: 'Alternate phone', aliases: ['altphone', 'alternatephone', 'alternateno'] },
  { value: 'date_of_birth', label: 'Date of birth', aliases: ['dob', 'dateofbirth', 'birthdate'] },
  { value: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { value: 'blood_group', label: 'Blood group', aliases: ['bloodgroup', 'bloodgrp'] },
  { value: 'address', label: 'Address', aliases: ['address', 'addr'] },
  { value: 'city', label: 'City', aliases: ['city'] },
  { value: 'state', label: 'State', aliases: ['state'] },
  { value: 'pincode', label: 'PIN code', aliases: ['pincode', 'pin', 'zip'] },
  { value: 'emergency_contact_name', label: 'Emergency contact name', aliases: ['emergencycontactname', 'emergencycontact'] },
  { value: 'emergency_contact_phone', label: 'Emergency contact phone', aliases: ['emergencycontactphone', 'emergencyno', 'emergencyphone'] },
  { value: 'pan_number', label: 'PAN', aliases: ['pan', 'panno', 'pannumber', 'pancard'] },
  { value: 'aadhaar_number', label: 'Aadhaar', aliases: ['aadhaar', 'aadhar', 'aadhaarno', 'aadharno', 'aadhaarnumber', 'uid'] },
  { value: 'uan_number', label: 'UAN', aliases: ['uan', 'uanno', 'pfno', 'pfnumber'] },
  { value: 'esic_number', label: 'ESIC', aliases: ['esic', 'esicno', 'esino'] },
  { value: 'bank_name', label: 'Bank name', aliases: ['bankname', 'bank'] },
  { value: 'bank_account', label: 'Bank account', aliases: ['bankaccount', 'accountno', 'accountnumber', 'acno'] },
  { value: 'bank_ifsc', label: 'IFSC', aliases: ['ifsc', 'ifsccode'] },
  { value: 'monthly_gross', label: 'Monthly gross', aliases: ['salary', 'gross', 'monthlygross', 'ctc', 'grosssalary'] },
  { value: 'notes', label: 'Notes', aliases: ['notes', 'remarks', 'comments'] },
]

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function guessTarget(header) {
  const h = norm(header)
  if (!h) return ''
  for (const t of TARGETS) {
    if (t.value && (norm(t.label) === h || t.aliases?.includes(h))) return t.value
  }
  return ''
}

function parseDateCell(v) {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const dt = new Date(s)
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10)
}

function mapStatus(v) {
  const s = norm(v)
  if (['active', 'current', 'working', 'employed', 'yes'].includes(s)) return 'active'
  if (['exited', 'exit', 'left', 'resigned', 'inactive', 'terminated', 'relieved'].includes(s)) return 'exited'
  if (['joining', 'candidate', 'offered', 'prejoining'].includes(s)) return 'joining'
  if (['notjoined', 'declined', 'noshow'].includes(s)) return 'not_joined'
  return null
}

export default function ImportPeople() {
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)     // array of objects keyed by header
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({}) // header -> target field
  const [defaultStatus, setDefaultStatus] = useState('active')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: ({ data, meta }) => {
        const hdrs = (meta.fields || []).filter(Boolean)
        if (!hdrs.length || !data.length) return toast('Could not read any rows from that file', 'error')
        setHeaders(hdrs)
        setRows(data)
        const m = {}
        for (const h of hdrs) m[h] = guessTarget(h)
        setMapping(m)
        setResult(null)
      },
      error: (err) => toast(err.message, 'error'),
    })
  }

  const mappedCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping])
  const nameHeader = useMemo(() => headers.find((h) => mapping[h] === 'full_name'), [headers, mapping])

  const buildPayload = (row) => {
    const p = {}
    for (const [header, target] of Object.entries(mapping)) {
      if (!target) continue
      let v = row[header]
      v = v == null ? null : String(v).trim()
      if (!v) continue
      if (target === 'date_of_join' || target === 'date_of_exit' || target === 'date_of_birth') v = parseDateCell(v)
      else if (target === 'status') v = mapStatus(v)
      else if (target === 'sales_role') {
        const s = norm(v)
        v = s.includes('rsm') || s.includes('regional') ? 'rsm'
          : s.includes('asm') || s.includes('areasales') ? 'asm'
          : s.includes('head') || s === 'ho' ? 'head_office'
          : 'sales'
      }
      else if (target === 'monthly_gross') v = Number(String(v).replace(/[^\d.]/g, '')) || null
      else if (target === 'employment_type') {
        const s = norm(v)
        v = s.includes('intern') ? 'intern' : s.includes('contract') ? 'contract' : s.includes('part') ? 'part_time' : 'full_time'
      }
      if (v != null) p[target] = v
    }
    if (!p.status) p.status = defaultStatus
    return p
  }

  const doImport = async () => {
    if (!nameHeader) return toast('Map one column to “Full name” first', 'error')
    setImporting(true)
    try {
      const payloads = rows.map(buildPayload).filter((p) => p.full_name)
      let inserted = 0
      const errors = []
      for (let i = 0; i < payloads.length; i += 100) {
        const chunk = payloads.slice(i, i + 100)
        const { error, count } = await supabase.from('people').upsert(chunk, { onConflict: 'emp_code', ignoreDuplicates: false, count: 'exact' })
        if (error) errors.push(error.message)
        else inserted += count ?? chunk.length
      }
      setResult({ total: payloads.length, inserted, skipped: rows.length - payloads.length, errors })
      qc.invalidateQueries({ queryKey: ['people'] })
      if (!errors.length) {
        toast(`Imported ${inserted} people`)
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Import people from CSV"
        sub="Export your current employee Google Sheet as CSV (File → Download → CSV), then upload it here. Rows with a matching employee code are updated, not duplicated."
      />

      {!rows ? (
        <Card>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-14 text-center transition-colors hover:border-red-400 hover:bg-red-50/30">
            <Upload className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Choose a CSV file</p>
            <p className="mt-1 text-xs text-slate-400">First row must be column headers</p>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
        </Card>
      ) : result ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-900">{result.inserted} people imported</p>
            <p className="mt-1 text-sm text-slate-500">
              {result.skipped > 0 && `${result.skipped} rows skipped (no name). `}
              {result.errors.length > 0 && <span className="text-red-600">{result.errors.length} chunk error(s): {result.errors[0]}</span>}
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => { setRows(null); setResult(null) }}>Import another file</Button>
              <Button icon={ArrowRight} onClick={() => navigate('/people')}>Go to People</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title={`Map columns (${rows.length} rows found)`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-600" title={h}>{h}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <Select value={mapping[h] || ''} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}>
                    {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-600">If a row has no status column/value, treat it as</span>
              <Select className="w-40" value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="joining">Joining soon</option>
                <option value="exited">Exited</option>
              </Select>
            </div>
          </Card>

          <Card title="Preview (first 5 rows)" pad={false}>
            <Table className="rounded-none border-0 shadow-none">
              <thead>
                <tr>
                  {headers.filter((h) => mapping[h]).map((h) => (
                    <Th key={h}>{TARGETS.find((t) => t.value === mapping[h])?.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => {
                  const p = buildPayload(r)
                  return (
                    <Tr key={i}>
                      {headers.filter((h) => mapping[h]).map((h) => (
                        <Td key={h} className="max-w-40 truncate text-xs">{String(p[mapping[h]] ?? '')}</Td>
                      ))}
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </Card>

          <div className="flex items-center justify-between pb-8">
            <p className="text-sm text-slate-500">{mappedCount} of {headers.length} columns mapped {!nameHeader && <Badge tone="red" className="ml-2">Full name not mapped</Badge>}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setRows(null)}>Start over</Button>
              <Button onClick={doImport} loading={importing} disabled={!nameHeader}>Import {rows.length} rows</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
