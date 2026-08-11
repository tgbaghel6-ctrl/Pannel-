/** SMS / data parsing helpers — pure functions */

const BANK_SENDERS = /(?:sbi|hdfc|icici|axis|kotak|yes\s?bank|pnb|bob|union|canara|idbi|indusind|federal|rbl|bandhan|au\s?bank|citi|hsbc|standard\s?chartered)/i
const BALANCE_RE = /(?:(?:avail(?:able)?|a\/c|account|bal(?:ance)?|avl)\s*(?:bal(?:ance)?)?[:\s]*)(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i
const AMOUNT_RE = /(?:(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)|(?:debited|credited|spent|paid|received)\s*(?:by|with|of|for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*))/i
const DEBIT_RE = /(?:debited|spent|paid|withdrawn|purchase|txn)/i
const CREDIT_RE = /(?:credited|received|deposited|refund)/i
const ACCOUNT_RE = /(?:a\/c|account|acc(?:ount)?)\s*(?:no\.?|number|#)?\s*[xX*]*(\d{4})/i
const CARD_RE = /(?:card|xxxx|ending)\s*(?:no\.?|#)?\s*[xX*]*(\d{4})/i
const EXPIRY_RE = /(?:exp(?:iry)?|valid\s*thru)\s*[:\s]*(\d{2}[\/\-]\d{2,4})/i
const CVV_RE = /(?:cvv|cvc|security\s*code)\s*[:\s]*(\d{3,4})/i
const UPI_RE = /(?:upi|pin|vpa|@ok|@ybl|@paytm|@ibl)/i

export function formatCurrency(val: string | number | undefined): string {
  if (val == null || val === '') return '—'
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''))
  if (isNaN(n)) return String(val)
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function relativeTime(ts: number | undefined): string {
  if (!ts) return 'never'
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

export function detectSmsType(body: string): 'bank' | 'card' | 'normal' {
  if (CARD_RE.test(body) || CVV_RE.test(body) || EXPIRY_RE.test(body)) return 'card'
  if (BANK_SENDERS.test(body) || BALANCE_RE.test(body) || /(?:debited|credited|a\/c)/i.test(body)) return 'bank'
  return 'normal'
}

export function parseBankFromSms(body: string, id: string, ts: number, sender?: string) {
  const balanceMatch = body.match(BALANCE_RE)
  const amountMatch = body.match(AMOUNT_RE)
  const accountMatch = body.match(ACCOUNT_RE)
  let type: 'credit' | 'debit' | 'info' = 'info'
  if (DEBIT_RE.test(body)) type = 'debit'
  else if (CREDIT_RE.test(body)) type = 'credit'

  const amount = amountMatch ? (amountMatch[1] || amountMatch[2]) : undefined
  const bankName = (body.match(BANK_SENDERS)?.[0] || sender || 'Bank').toUpperCase()

  return {
    id,
    bankName,
    balance: balanceMatch?.[1],
    amount,
    type,
    accountLast4: accountMatch?.[1],
    sender,
    body,
    timestamp: ts,
  }
}

export function parseCardFromSms(body: string, id: string, ts: number) {
  const last4 = body.match(CARD_RE)?.[1] || body.match(/\b(\d{4})\b/)?.[1] || '????'
  const expiry = body.match(EXPIRY_RE)?.[1]
  const cvv = body.match(CVV_RE)?.[1]
  let type = 'Card'
  if (/visa/i.test(body)) type = 'Visa'
  else if (/master/i.test(body)) type = 'Mastercard'
  else if (/rupay/i.test(body)) type = 'RuPay'
  else if (/amex/i.test(body)) type = 'Amex'

  return { id, last4, type, expiry, cvv, body, timestamp: ts }
}

export function hasUpiSignal(body: string): boolean {
  return UPI_RE.test(body)
}

export function extractPhoneFromText(text: string): string | undefined {
  const m = text.match(/(?:\+91[\s\-]?)?[6-9]\d{9}/)
  return m?.[0]
}
