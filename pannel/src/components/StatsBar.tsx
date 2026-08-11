import { Smartphone, Wifi, WifiOff, Landmark, CreditCard } from 'lucide-react'

interface Props {
  total: number
  online: number
  offline: number
  bank: number
  card: number
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Smartphone
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 min-w-[120px]">
      <div className={`rounded-lg p-2 ${accent || 'bg-slate-800 text-slate-400'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function StatsBar({ total, online, offline, bank, card }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Stat icon={Smartphone} label="Total" value={total} accent="bg-sky-500/15 text-sky-400" />
      <Stat icon={Wifi} label="Online" value={online} accent="bg-emerald-500/15 text-emerald-400" />
      <Stat icon={WifiOff} label="Offline" value={offline} accent="bg-slate-800 text-slate-400" />
      <Stat icon={Landmark} label="Bank SMS" value={bank} accent="bg-emerald-500/15 text-emerald-400" />
      <Stat icon={CreditCard} label="Cards" value={card} accent="bg-fuchsia-500/15 text-fuchsia-400" />
    </div>
  )
}
