import { createContext, useContext, useEffect, useRef, useState, forwardRef } from 'react'
import { Loader2, Search, X, AlertTriangle, CheckCircle2, Info as InfoIcon } from 'lucide-react'

export function cx(...args) {
  return args.filter(Boolean).join(' ')
}

/* ---------------- Buttons ---------------- */

const btnVariants = {
  primary: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-300',
  dangerSubtle: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:text-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:bg-emerald-300',
}
const btnSizes = {
  md: 'px-3.5 py-2 text-sm gap-2',
  sm: 'px-2.5 py-1.5 text-sm gap-1.5',
  xs: 'px-2 py-1 text-xs gap-1',
}

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors select-none',
        'disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500',
        btnVariants[variant],
        btnSizes[size],
        className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
    </button>
  )
}

/* ---------------- Form controls ---------------- */

const controlCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
  'focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-500'

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(controlCls, className)} {...rest} />
})

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(controlCls, className)} {...rest} />
})

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(controlCls, 'pr-8', className)} {...rest}>
      {children}
    </select>
  )
})

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1 block text-[13px] font-medium text-slate-600">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Checkbox({ label, hint, className, ...rest }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500" {...rest} />
      <span className="text-sm text-slate-700">
        {label}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(controlCls, 'pl-9')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/* ---------------- Badges ---------------- */

// Red / black / white. `green` and `amber` stay semantic: on a purchase
// order, "approved" and "rejected" must not look the same colour.
const badgeTones = {
  gray: 'bg-slate-100 text-slate-600',
  slate: 'bg-slate-200 text-slate-700',
  green: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300',
  red: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-300',
  amber: 'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-300',
  blue: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300',
  indigo: 'bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300',
  violet: 'bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-300',
}

export function Badge({ tone = 'gray', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

/* ---------------- Layout helpers ---------------- */

export function PageHeader({ title, sub, actions, backTo, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, className, children, pad = true }) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-slate-400', className)} />
}

export function FullPageSpinner({ label }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-7 w-7 animate-spin" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center', className)}>
      {Icon && <Icon className="mb-3 h-8 w-8 text-slate-300" />}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------------- Table ---------------- */

export function Table({ children, className }) {
  return (
    <div className={cx('overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({ className, children, right }) {
  return (
    <th className={cx('border-b border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500', right && 'text-right', className)}>
      {children}
    </th>
  )
}

export function Td({ className, children, right, ...rest }) {
  return (
    <td className={cx('border-b border-slate-100 px-3.5 py-2.5 align-middle text-slate-700', right && 'text-right', className)} {...rest}>
      {children}
    </td>
  )
}

export function Tr({ className, onClick, children }) {
  return (
    <tr
      onClick={onClick}
      className={cx('last:[&>td]:border-b-0', onClick && 'cursor-pointer transition-colors hover:bg-red-50/40', className)}
    >
      {children}
    </tr>
  )
}

/* ---------------- Tabs ---------------- */

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex flex-wrap gap-1 rounded-lg bg-slate-200/60 p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cx('ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]', value === t.value ? 'bg-red-100 text-red-700' : 'bg-slate-300/60 text-slate-600')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Modal ---------------- */

const modalSizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, sub, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('w-full rounded-xl bg-white shadow-2xl', modalSizes[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------------- Info rows (detail views) ---------------- */

export function Info({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children ?? '—'}</dd>
    </div>
  )
}

/* ---------------- Toasts ---------------- */

const ToastCtx = createContext(null)
let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }

  const toast = (message, type = 'success') => {
    const id = ++toastId
    setToasts((t) => [...t, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000)
  }

  const icons = {
    success: <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />,
    error: <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500" />,
    info: <InfoIcon className="h-4.5 w-4.5 shrink-0 text-sky-500" />,
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-lg">
            {icons[t.type] || icons.info}
            <p className="flex-1 break-words text-sm text-slate-700">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-300 hover:text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const toast = useContext(ToastCtx)
  return toast || (() => {})
}
