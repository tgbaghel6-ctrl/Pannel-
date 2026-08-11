import type { SavedAccount } from './types'

const KEY = 'nexus_saved_accounts'

export function loadAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedAccount[]
  } catch {
    return []
  }
}

export function saveAccounts(list: SavedAccount[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function upsertAccount(acc: Omit<SavedAccount, 'id' | 'savedAt'> & { id?: string }) {
  const list = loadAccounts()
  const existing = list.findIndex((a) => a.url === acc.url && a.key === acc.key)
  const entry: SavedAccount = {
    id: acc.id || crypto.randomUUID(),
    url: acc.url,
    key: acc.key,
    label: acc.label,
    savedAt: Date.now(),
  }
  if (existing >= 0) list[existing] = entry
  else list.unshift(entry)
  saveAccounts(list.slice(0, 20))
  return entry
}

export function removeAccount(id: string) {
  const list = loadAccounts().filter((a) => a.id !== id)
  saveAccounts(list)
  return list
}
