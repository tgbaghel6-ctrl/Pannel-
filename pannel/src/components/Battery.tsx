export function BatteryIndicator({ level = 0, charging }: { level?: number; charging?: boolean }) {
  const pct = Math.max(0, Math.min(100, level))
  const color =
    pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <div className="inline-flex items-center gap-1.5" title={`${pct}%${charging ? ' · charging' : ''}`}>
      <div className="relative h-3.5 w-6 rounded-[3px] border border-slate-500 bg-slate-800/80">
        <div
          className={`absolute left-[1px] top-[1px] bottom-[1px] rounded-[2px] transition-all ${color}`}
          style={{ width: `calc(${pct}% - 2px)` }}
        />
        <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 h-1.5 w-[2px] rounded-r-sm bg-slate-500" />
      </div>
      <span className="text-[11px] tabular-nums text-slate-400">{pct}%</span>
      {charging && <span className="text-[10px] text-amber-400">⚡</span>}
    </div>
  )
}
