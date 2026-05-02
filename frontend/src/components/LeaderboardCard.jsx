import { formatGrams } from '../utils/format'

export default function LeaderboardCard({ entry, isCurrent }) {
  const isFirst = entry.rank === 1

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
        isCurrent ? 'bg-red-50 border-l-4 border-primary' : ''
      }`}
    >
      <span
        className={`w-8 text-center text-sm font-bold tabular-nums ${
          isFirst ? 'text-accent' : 'text-text-secondary'
        }`}
      >
        {entry.rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text truncate">{entry.name}</span>
          {isCurrent && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Ihr</span>
          )}
        </div>
        {entry.totalGrams > 0 ? (
          <span className="text-xs text-text-secondary tabular-nums">{formatGrams(entry.totalGrams)}</span>
        ) : (
          <span className="text-xs text-text-secondary">Noch keine Einkäufe</span>
        )}
      </div>

      <span className="text-xs text-text-secondary tabular-nums">{entry.purchaseCount} Einkäufe</span>
    </div>
  )
}
