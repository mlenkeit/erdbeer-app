import { useCallback } from 'react'
import { useToken } from '../context/TokenContext'
import { getLeaderboard } from '../api'
import { useApi } from '../hooks/useApi'
import { formatGrams } from '../utils/format'
import LeaderboardCard from '../components/LeaderboardCard'
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
      <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3">
        <p>{error.message || 'Etwas ist schiefgelaufen'}</p>
        <button onClick={refetch} className="mt-2 text-sm font-medium underline">Nochmal versuchen</button>
      </div>
    )
  }

  const entries = data?.leaderboard || []
  const currentGroupId = data?.currentGroupId

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-secondary">Noch keine Gruppen in dieser Saison</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrent = entry.groupId === currentGroupId
        return (
          <div key={entry.groupId}>
            <LeaderboardCard entry={entry} isCurrent={isCurrent} />
            {isCurrent && entry.rank === 1 && (
              <p className="text-xs font-medium text-accent ml-11 mt-0.5">Platz 1!</p>
            )}
            {isCurrent && entry.gapToNextGrams === 0 && entry.rank > 1 && (
              <p className="text-xs text-text-secondary ml-11 mt-0.5">Gleichauf auf Platz {entry.rank}!</p>
            )}
            {isCurrent && entry.gapToNextGrams > 0 && (
              <p className="text-xs text-text-secondary ml-11 mt-0.5">
                {formatGrams(entry.gapToNextGrams)} hinter Platz {entry.rank - 1}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
