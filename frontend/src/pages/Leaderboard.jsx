import { useCallback } from 'react'
import { useToken } from '../context/TokenContext'
import { getLeaderboard } from '../api'
import { useApi } from '../hooks/useApi'
import { formatGrams } from '../utils/format'
import { AppCard } from '../components/AppCard'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRow } from '../components/Skeleton'

export default function Leaderboard() {
  const { token } = useToken()

  const fetchLeaderboard = useCallback(() => getLeaderboard(token), [token])
  const { data, loading, error, refetch } = useApi(fetchLeaderboard)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <AppCard className="p-4">
        <p className="text-sm text-strawberry-700">{error.message || 'Etwas ist schiefgelaufen'}</p>
        <button onClick={refetch} className="mt-2 text-sm font-semibold text-strawberry-600 underline">Nochmal versuchen</button>
      </AppCard>
    )
  }

  const entries = data?.leaderboard || []
  const currentGroupId = data?.currentGroupId

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Die Rangliste wartet auf den ersten Einkauf"
        description="Sobald jemand Erdbeeren einträgt, geht der Vergleich los."
      />
    )
  }

  const rankColors = {
    1: 'bg-gold-100 text-gold-700',
    2: 'bg-ink-300/20 text-ink-700',
    3: 'bg-cream-300 text-ink-700',
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrent = entry.groupId === currentGroupId
        return (
          <AppCard
            key={entry.groupId}
            className={`relative overflow-hidden p-4 ${isCurrent ? 'bg-blush-100 border-strawberry-200' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold ${
                rankColors[entry.rank] || 'bg-cream-200 text-ink-700'
              }`}>
                {entry.rank}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-ink-900">{entry.name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-strawberry-500 px-2 py-0.5 text-xs font-bold text-white">
                      Ihr
                    </span>
                  )}
                </div>
                {isCurrent && entry.rank === 1 && (
                  <p className="text-xs font-medium text-gold-700">Platz 1!</p>
                )}
                {isCurrent && entry.gapToNextGrams === 0 && entry.rank > 1 && (
                  <p className="text-xs text-ink-500">Gleichauf auf Platz {entry.rank}!</p>
                )}
                {isCurrent && entry.gapToNextGrams > 0 && (
                  <p className="text-xs text-ink-500">
                    {formatGrams(entry.gapToNextGrams)} hinter Platz {entry.rank - 1}
                  </p>
                )}
              </div>

              <p className="font-heading text-2xl font-bold tabular-nums text-strawberry-600">
                {entry.totalGrams > 0 ? formatGrams(entry.totalGrams) : '–'}
              </p>
            </div>
          </AppCard>
        )
      })}
    </div>
  )
}
