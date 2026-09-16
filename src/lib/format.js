const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})
const inrFmt0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const numFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })

export function inr(n, { compact = false } = {}) {
  const v = Number(n ?? 0)
  if (compact && Math.abs(v) >= 100000) {
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
    return `₹${(v / 100000).toFixed(2)} L`
  }
  return Number.isInteger(v) && Math.abs(v) >= 100000 ? inrFmt0.format(v) : inrFmt.format(v)
}

export function num(n) {
  return numFmt.format(Number(n ?? 0))
}

export function fmtDate(d) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return '—'
  return (
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
}

/** Indian fiscal year code for a date, e.g. Sep 2026 -> "26-27" */
export function fyCode(d = new Date()) {
  const date = new Date(d)
  const y = date.getFullYear() % 100
  return date.getMonth() + 1 >= 4
    ? `${String(y).padStart(2, '0')}-${String((y + 1) % 100).padStart(2, '0')}`
    : `${String((y - 1 + 100) % 100).padStart(2, '0')}-${String(y).padStart(2, '0')}`
}

/** Amount in words, Indian numbering (for PO PDFs). */
export function amountInWords(amount) {
  const n = Math.round(Number(amount ?? 0) * 100) / 100
  if (!isFinite(n)) return ''
  const rupees = Math.floor(Math.abs(n))
  const paise = Math.round((Math.abs(n) - rupees) * 100)

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const twoDigits = (x) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`)
  const threeDigits = (x) => {
    const h = Math.floor(x / 100)
    const r = x % 100
    return `${h ? ones[h] + ' Hundred' : ''}${h && r ? ' ' : ''}${r ? twoDigits(r) : ''}`
  }

  const parts = []
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const rest = rupees % 1000
  if (crore) parts.push(`${twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (rest) parts.push(threeDigits(rest))

  let words = rupees === 0 ? 'Zero' : parts.join(' ')
  words = `${n < 0 ? 'Minus ' : ''}Rupees ${words}`
  if (paise) words += ` and ${twoDigits(paise)} Paise`
  return words + ' Only'
}

export function daysUntil(d) {
  if (!d) return null
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
