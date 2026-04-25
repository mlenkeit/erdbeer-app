import { formatGrams, formatPrice } from '../utils/format'

export default function StatsCard({ stats }) {
  const items = [
    { label: 'Gesamtmenge', value: formatGrams(stats.totalGrams) },
    { label: 'Einkäufe', value: stats.purchaseCount },
    { label: 'Ø Preis/kg', value: stats.avgPricePerKgCents ? formatPrice(stats.avgPricePerKgCents) : '–' },
  ]

  return (
    <div className="flex gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex-1 bg-surface rounded-xl shadow-sm p-3 text-center">
          <p className="text-lg font-bold text-text tabular-nums">{item.value}</p>
          <p className="text-xs text-text-secondary">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
