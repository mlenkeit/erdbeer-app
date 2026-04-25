import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { getLeaderboard } from '../api'
import { useApi } from '../hooks/useApi'
import { formatGrams, formatDate } from '../utils/format'
import { isSeasonEnded, isBeforeSeasonStart, seasonDaysLeft, seasonProgress } from '../utils/season'
import StatsCard from '../components/StatsCard'
import LeaderboardCard from '../components/LeaderboardCard'
import Toast from '../components/Toast'
import { SkeletonStats, SkeletonCard } from '../components/Skeleton'

function getMiniLeaderboard(leaderboard, currentGroupId) {
  if (!leaderboard || leaderboard.length === 0) return []

  const currentIndex = leaderboard.findIndex((e) => e.groupId === currentGroupId)
  if (currentIndex === -1) return leaderboard.slice(0, 3)

  if (currentIndex < 3) {
    return leaderboard.slice(0, 3)
  }

  const result = []
  if (currentIndex > 0) result.push(leaderboard[currentIndex - 1])
  result.push(leaderboard[currentIndex])
  if (currentIndex < leaderboard.length - 1) result.push(leaderboard[currentIndex + 1])
  return result
}

function getGapText(entry, currentGroupId) {
  if (entry.groupId !== currentGroupId) return null
  if (entry.rank === 1) return null
  if (entry.gapToNextGrams === 0) return `Gleichauf auf Platz ${entry.rank}!`
  if (entry.gapToNextGrams > 0) return `${formatGrams(entry.gapToNextGrams)} hinter Platz ${entry.rank - 1}`
  return null
}

export default function GroupHome() {
  const { token, season, stats, loading: ctxLoading, error: ctxError, refetch: refetchGroup } = useToken()
  const [searchParams, setSearchParams] = useSearchParams()

  const fetchLeaderboard = useCallback(() => getLeaderboard(token), [token])
  const { data: lbData, loading: lbLoading, error: lbError, refetch: refetchLb } = useApi(fetchLeaderboard)

  const successType = searchParams.get('success')
  const toastMessage = successType === 'saved' ? 'Einkauf gespeichert!' : successType === 'deleted' ? 'Einkauf gelöscht!' : null

  function dismissToast() {
    setSearchParams({}, { replace: true })
  }

  const ended = isSeasonEnded(season)
  const beforeStart = isBeforeSeasonStart(season)
  const daysLeft = seasonDaysLeft(season)
  const progress = seasonProgress(season)
  const hasPurchases = stats && stats.purchaseCount > 0

  const miniLb = getMiniLeaderboard(lbData?.leaderboard, lbData?.currentGroupId)

  if (ctxLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (ctxError) {
    return (
      <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3">
        <p>{ctxError.message || 'Etwas ist schiefgelaufen'}</p>
        <button onClick={refetchGroup} className="mt-2 text-sm font-medium underline">Nochmal versuchen</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} type="success" onClose={dismissToast} />}

      {ended && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-4 py-3">
          Die Saison ist beendet!
        </div>
      )}

      {beforeStart && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-4 py-3">
          Die Saison startet am {formatDate(season.startDate)}
        </div>
      )}

      {!hasPurchases && !ended && !beforeStart && (
        <div className="text-center py-4">
          <p className="text-sm text-text-secondary">
            Wer kauft die meisten Erdbeeren? Trag deinen Einkauf ein und finde es heraus!
          </p>
        </div>
      )}

      {!ended && !beforeStart && (
        <Link
          to={`/${token}/erfassen`}
          className="block w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm text-center min-h-[48px] leading-[48px]"
        >
          Einkauf erfassen
        </Link>
      )}

      {hasPurchases && stats && <StatsCard stats={stats} />}

      {!hasPurchases && !ended && !beforeStart && (
        <p className="text-sm text-text-secondary text-center">Noch keine Einkäufe — los geht's!</p>
      )}

      {lbLoading ? (
        <SkeletonCard />
      ) : lbError ? (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3">
          <p>Rangliste konnte nicht geladen werden.</p>
          <button onClick={refetchLb} className="mt-2 text-sm font-medium underline">Nochmal versuchen</button>
        </div>
      ) : miniLb.length > 0 && (
        <div className="bg-surface rounded-xl shadow-sm p-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-text">Rangliste</p>
            <Link to={`/${token}/rangliste`} className="text-xs text-primary font-medium">Alle anzeigen</Link>
          </div>
          {miniLb.map((entry) => (
            <div key={entry.groupId}>
              <LeaderboardCard entry={entry} isCurrent={entry.groupId === lbData.currentGroupId} />
              {entry.groupId === lbData.currentGroupId && entry.rank === 1 && (
                <p className="text-xs font-medium text-accent ml-11 mt-0.5">Platz 1!</p>
              )}
              {getGapText(entry, lbData.currentGroupId) && entry.rank !== 1 && (
                <p className="text-xs text-text-secondary ml-11 mt-0.5">{getGapText(entry, lbData.currentGroupId)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {season && !beforeStart && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary text-center">
            {ended ? 'Saison beendet' : `noch ${daysLeft} Tage`}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Link to={`/${token}/rangliste`} className="flex-1 py-2 text-center text-sm text-primary font-medium border border-primary/20 rounded-xl">
          Rangliste
        </Link>
        <Link to={`/${token}/verlauf`} className="flex-1 py-2 text-center text-sm text-primary font-medium border border-primary/20 rounded-xl">
          Verlauf
        </Link>
      </div>
    </div>
  )
}
