import { Link } from 'react-router-dom'
import { formatGrams, formatPrice, formatDate } from '../utils/format'
import { AppCard } from './AppCard'
import { DecorativeBerry } from './DecorativeBerry'

function summarizeItems(items) {
  const counts = {}
  for (const item of items) {
    const key = `${item.bagSizeGrams}g`
    counts[key] = (counts[key] || 0) + item.quantity
  }
  return Object.entries(counts)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .map(([size, qty]) => `${qty}× ${size}`)
    .join(', ')
}

export default function PurchaseList({ purchases, token }) {
  return (
    <div className="space-y-2">
      {purchases.map((purchase) => (
        <Link
          key={purchase.id}
          to={`/${token}/einkauf/${purchase.id}`}
          className="block"
        >
          <AppCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-200">
                <DecorativeBerry className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{summarizeItems(purchase.items)}</p>
                <p className="text-sm text-ink-500">{formatDate(purchase.purchasedAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums text-strawberry-600">{formatGrams(purchase.totalGrams)}</p>
                <p className="text-xs tabular-nums text-ink-500">{formatPrice(purchase.totalPriceCents)}</p>
              </div>
            </div>
          </AppCard>
        </Link>
      ))}
    </div>
  )
}
