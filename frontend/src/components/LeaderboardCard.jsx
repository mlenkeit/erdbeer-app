import { formatGrams } from '../utils/format'

export default function LeaderboardCard({ entry, isCurrent }) {
  const rankColors = {
    1: 'bg-gold-100 text-gold-700',
    2: 'bg-ink-300/20 text-ink-700',
    3: 'bg-cream-300 text-ink-700',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isCurrent ? 'bg-blush-100/80' : ''
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
          rankColors[entry.rank] || 'bg-cream-200 text-ink-700'
        }`}
      >
        {entry.rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-900 truncate">{entry.name}</span>
          {isCurrent && (
            <span className="rounded-full bg-strawberry-500 px-2 py-0.5 text-xs font-bold text-white">
              Ihr
            </span>
          )}
        </div>
      </div>

      <span className="text-sm font-bold tabular-nums text-strawberry-600">
        {entry.totalGrams > 0 ? formatGrams(entry.totalGrams) : '–'}
      </span>
    </div>
  )
}
