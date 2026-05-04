import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { getPurchases } from '../api'
import { useApi } from '../hooks/useApi'
import { formatGrams, formatPrice } from '../utils/format'
import PurchaseList from '../components/PurchaseList'
import { AppCard } from '../components/AppCard'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRow, SkeletonCard } from '../components/Skeleton'

export default function History() {
  const { token } = useToken()

  const fetchPurchases = useCallback(() => getPurchases(token), [token])
  const { data, loading, error, refetch } = useApi(fetchPurchases)

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
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

  const purchases = data?.purchases || []
  const summary = data?.summary

  if (purchases.length === 0) {
    return (
      <EmptyState
        title="Noch keine Erdbeeren gesammelt"
        description="Trag euren ersten Einkauf ein und startet in die Saison."
        action={
          <Link
            to={`/${token}/erfassen`}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-strawberry-500 px-5 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(233,67,74,0.28)] transition active:scale-[0.98]"
          >
            Ersten Einkauf erfassen
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {summary && (
        <AppCard className="flex gap-3 p-3">
          <div className="flex-1 text-center">
            <p className="text-sm font-bold tabular-nums text-leaf-900">{formatGrams(summary.totalGrams)}</p>
            <p className="text-xs text-ink-500">Gesamt</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold tabular-nums text-leaf-900">{formatPrice(summary.totalPriceCents)}</p>
            <p className="text-xs text-ink-500">Ausgaben</p>
          </div>
          {summary.avgPricePerKgCents && (
            <div className="flex-1 text-center">
              <p className="text-sm font-bold tabular-nums text-leaf-900">{formatPrice(summary.avgPricePerKgCents)}/kg</p>
              <p className="text-xs text-ink-500">Ø Preis</p>
            </div>
          )}
        </AppCard>
      )}

      <PurchaseList purchases={purchases} token={token} />
    </div>
  )
}
