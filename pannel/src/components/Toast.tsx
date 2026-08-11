import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import type { ToastItem } from '../lib/types'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warn: AlertTriangle,
}

const colors = {
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-rose-500/40 bg-rose-950/90 text-rose-100',
  info: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  warn: 'border-amber-500/40 bg-amber-950/90 text-amber-100',
}

export function ToastStack({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${colors[t.type]}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs opacity-80 leading-snug">{t.message}</p>}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="rounded-md p-1 opacity-60 hover:opacity-100 transition"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
