import { Link } from 'react-router-dom'
import { formatGrams, formatPrice, formatDate } from '../utils/format'

function summarizeItems(items) {
  const counts = {}
  for (const item of items) {
    const key = `${item.bagSizeGrams}g`
    counts[key] = (counts[key] || 0) + item.quantity
  }
  return Object.entries(counts)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .map(([size, qty]) => `${qty}x ${size}`)
    .join(', ')
}

export default function PurchaseList({ purchases, token }) {
  return (
    <div className="space-y-2">
      {purchases.map((purchase) => (
        <Link
          key={purchase.id}
          to={`/${token}/einkauf/${purchase.id}`}
          className="block bg-surface rounded-xl shadow-sm p-3"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{formatDate(purchase.purchasedAt)}</p>
              <p className="text-xs text-text-secondary mt-0.5">{summarizeItems(purchase.items)}</p>
            </div>
            <div className="text-right ml-3">
              <p className="text-sm font-medium text-text tabular-nums">{formatGrams(purchase.totalGrams)}</p>
              <p className="text-xs text-text-secondary tabular-nums">{formatPrice(purchase.totalPriceCents)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
