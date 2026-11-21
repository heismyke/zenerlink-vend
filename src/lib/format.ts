// Money is integer kobo end to end; it is only turned into text here.
export const naira = (kobo: number | null | undefined) =>
  kobo == null ? '—' : '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })

export const kwh = (wh: number | null | undefined) =>
  wh == null ? '—' : (wh / 1000).toLocaleString('en-NG', { maximumFractionDigits: 3 }) + ' kWh'

export const num = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-NG'))

export const dateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const date = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export const ago = (s?: string | null) => {
  if (!s) return 'never'
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

const special: Record<string, string> = { sts_token: 'STS token', sts: 'STS', nerc_permit: 'NERC permit', nerc_registration: 'NERC registration', cac_certificate: 'CAC certificate', gsm: '4G / GSM', tou: 'Time of use' }
export const words = (s: string) => special[s] ?? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// nairaToKobo parses a typed amount without floating point surprises.
export const nairaToKobo = (v: string): number | null => {
  const m = v.replace(/[,\s₦]/g, '').match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

export function downloadCSV(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
