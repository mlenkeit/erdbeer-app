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
import { AppCard } from '../components/AppCard'
import { DecorativeBerry } from '../components/DecorativeBerry'
import { EmptyState } from '../components/EmptyState'

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

function getRankHeroText(entry) {
  if (!entry) return null
  if (entry.rank === 1) return { title: 'Ihr führt!', subtitle: null }
  if (entry.gapToNextGrams === 0) return { title: `Platz ${entry.rank}`, subtitle: `Gleichauf auf Platz ${entry.rank}!` }
  return { title: `Platz ${entry.rank}`, subtitle: `${formatGrams(entry.gapToNextGrams)} bis Platz ${entry.rank - 1}` }
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
  const currentEntry = lbData?.leaderboard?.find((e) => e.groupId === lbData?.currentGroupId)
  const heroText = getRankHeroText(currentEntry)

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
      <AppCard className="p-4">
        <p className="text-sm text-strawberry-700">{ctxError.message || 'Etwas ist schiefgelaufen'}</p>
        <button onClick={refetchGroup} className="mt-2 text-sm font-semibold text-strawberry-600 underline">Nochmal versuchen</button>
      </AppCard>
    )
  }

  return (
    <div className="space-y-5">
      {toastMessage && <Toast message={toastMessage} type="success" onClose={dismissToast} />}

      {ended && (
        <AppCard variant="soft" className="px-4 py-3">
          <p className="text-sm font-medium text-strawberry-700">Die Saison ist beendet!</p>
        </AppCard>
      )}

      {beforeStart && (
        <AppCard variant="soft" className="px-4 py-3">
          <p className="text-sm font-medium text-leaf-800">Die Saison startet am {formatDate(season.startDate)}</p>
        </AppCard>
      )}

      {!ended && !beforeStart && (
        <Link
          to={`/${token}/erfassen`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-strawberry-500 px-5 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(233,67,74,0.28)] transition active:scale-[0.98]"
        >
          Einkauf erfassen
        </Link>
      )}

      {!hasPurchases && !ended && !beforeStart && (
        <EmptyState
          title="Noch keine Erdbeeren gesammelt"
          description="Trag euren ersten Einkauf ein und startet in die Saison."
        />
      )}

      {hasPurchases && heroText && (
        <AppCard variant="highlight" className="relative overflow-hidden p-5">
          <DecorativeBerry className="absolute -right-3 -top-3 h-20 w-20 opacity-90" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 text-3xl shadow-sm">
              <TrophyIcon className="h-8 w-8 text-gold-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-leaf-800">Ihr seid auf</p>
              <p className="font-heading text-4xl font-bold text-strawberry-600">{heroText.title}</p>
              {heroText.subtitle && (
                <p className="mt-1 text-sm font-medium text-ink-700">{heroText.subtitle}</p>
              )}
            </div>
          </div>
        </AppCard>
      )}

      {hasPurchases && stats && <StatsCard stats={stats} />}

      {lbLoading ? (
        <SkeletonCard />
      ) : lbError ? (
        <AppCard className="p-4">
          <p className="text-sm text-strawberry-700">Rangliste konnte nicht geladen werden.</p>
          <button onClick={refetchLb} className="mt-2 text-sm font-semibold text-strawberry-600 underline">Nochmal versuchen</button>
        </AppCard>
      ) : miniLb.length > 0 && (
        <AppCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold text-leaf-900">Top Rangliste</h2>
            <Link to={`/${token}/rangliste`} className="text-sm font-semibold text-strawberry-600">Alle anzeigen</Link>
          </div>
          <div className="divide-y divide-cream-200">
            {miniLb.map((entry) => (
              <LeaderboardCard key={entry.groupId} entry={entry} isCurrent={entry.groupId === lbData.currentGroupId} />
            ))}
          </div>
        </AppCard>
      )}

      {season && !beforeStart && (
        <AppCard variant="soft" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-leaf-900">Erdbeer-Saison</span>
            <span className="text-sm font-medium text-leaf-700">
              {ended ? 'beendet' : `noch ${daysLeft} Tage`}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-cream-300">
            <div
              className="h-2 rounded-full bg-leaf-500 transition-all"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
            <DecorativeBerry
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ left: `clamp(0px, calc(${progress * 100}% - 10px), calc(100% - 20px))` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink-500">
            <span>{formatDate(season.startDate)}</span>
            <span>{formatDate(season.endDate)}</span>
          </div>
        </AppCard>
      )}
    </div>
  )
}

function TrophyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
