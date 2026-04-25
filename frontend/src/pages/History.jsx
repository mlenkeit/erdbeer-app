import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { getPurchases } from '../api'
import { useApi } from '../hooks/useApi'
import { formatGrams, formatPrice } from '../utils/format'
import PurchaseList from '../components/PurchaseList'
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
      <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3">
        <p>{error.message || 'Etwas ist schiefgelaufen'}</p>
        <button onClick={refetch} className="mt-2 text-sm font-medium underline">Nochmal versuchen</button>
      </div>
    )
  }

  const purchases = data?.purchases || []
  const summary = data?.summary

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-text-secondary">Noch keine Einkäufe erfasst</p>
        <Link
          to={`/${token}/erfassen`}
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm"
        >
          Ersten Einkauf erfassen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="bg-surface rounded-xl shadow-sm p-3 flex gap-3">
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-text tabular-nums">{formatGrams(summary.totalGrams)}</p>
            <p className="text-xs text-text-secondary">Gesamt</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-text tabular-nums">{formatPrice(summary.totalPriceCents)}</p>
            <p className="text-xs text-text-secondary">Ausgaben</p>
          </div>
          {summary.avgPricePerKgCents && (
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-text tabular-nums">{formatPrice(summary.avgPricePerKgCents)}/kg</p>
              <p className="text-xs text-text-secondary">Ø Preis</p>
            </div>
          )}
        </div>
      )}

      <PurchaseList purchases={purchases} token={token} />
    </div>
  )
}
