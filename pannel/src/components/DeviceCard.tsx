import { Smartphone, Wifi, WifiOff, CreditCard, Landmark, Fingerprint } from 'lucide-react'
import type { Device } from '../lib/types'
import { relativeTime, formatCurrency } from '../lib/parse'
import { BatteryIndicator } from './Battery'

interface Props {
  device: Device
  selected?: boolean
  onClick: () => void
}

export function DeviceCard({ device, selected, onClick }: Props) {
  const online = !!device.online

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 hover:border-sky-500/40 hover:bg-slate-900/80 focus-visible:ring-2 focus-visible:ring-sky-400 ${
        selected
          ? 'border-sky-500/50 bg-sky-950/30 shadow-lg shadow-sky-500/5'
          : 'border-slate-800 bg-slate-900/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-100 truncate">
              {device.name || device.model || device.id}
            </p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{device.id}</p>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            online
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {online ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <BatteryIndicator level={device.battery} charging={device.isCharging} />
        {device.androidVersion && <span>Android {device.androidVersion}</span>}
        {device.phone && <span className="font-mono text-slate-300">{device.phone}</span>}
        {device.network && <span>{device.network}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {device.hasUpi && (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            <Fingerprint className="h-3 w-3" /> UPI
          </span>
        )}
        {device.hasBank && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
            <Landmark className="h-3 w-3" /> Bank
          </span>
        )}
        {device.hasCard && (
          <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
            <CreditCard className="h-3 w-3" /> Card
          </span>
        )}
        {device.latestBalance && (
          <span className="ml-auto text-[11px] font-medium text-sky-300 tabular-nums">
            {formatCurrency(device.latestBalance)}
          </span>
        )}
      </div>

      <p className="mt-2 text-[10px] text-slate-600">Last seen {relativeTime(device.lastSeen)}</p>
    </button>
  )
}
