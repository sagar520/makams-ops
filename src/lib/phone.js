// Indian mobile numbers. The app stores one canonical shape: +91XXXXXXXXXX.

/** Digits only, dropping a leading 91 / 0 country or trunk prefix. */
function tenDigits(input) {
  const d = String(input ?? '').replace(/\D+/g, '')
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  if (d.length === 11 && d.startsWith('0')) return d.slice(1)
  if (d.length === 13 && d.startsWith('091')) return d.slice(3)
  return d
}

/** True when the value is (or can be read as) an Indian mobile number. */
export const isMobile = (input) => /^[6-9]\d{9}$/.test(tenDigits(input))

/** '+91XXXXXXXXXX', or null when it isn't a valid mobile number. */
export const normalizeMobile = (input) => (isMobile(input) ? `+91${tenDigits(input)}` : null)

/** '+91 98765 43210' for display; falls back to whatever was stored. */
export const fmtMobile = (value) => {
  const t = tenDigits(value)
  return /^\d{10}$/.test(t) ? `+91 ${t.slice(0, 5)} ${t.slice(5)}` : (value || '')
}

/** What the user types inside a field that already shows a +91 prefix. */
export const mobileInput = (input) => tenDigits(input).slice(0, 10)

export const MOBILE_HINT = '10-digit mobile, starting 6–9'
