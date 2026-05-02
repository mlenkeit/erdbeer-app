import { formatGrams, formatPrice } from '../utils/format'
import { AppCard } from './AppCard'
import { DecorativeBerry } from './DecorativeBerry'

export default function StatsCard({ stats }) {
  const items = [
    { label: 'Gesamtmenge', value: formatGrams(stats.totalGrams) },
    { label: 'Einkäufe', value: stats.purchaseCount },
    { label: 'Ø Preis/kg', value: stats.avgPricePerKgCents ? formatPrice(stats.avgPricePerKgCents) : '–' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, i) => (
        <AppCard key={item.label} className="p-3 text-center">
          {i === 0 && <DecorativeBerry className="mx-auto mb-1 h-5 w-5" />}
          <div className="text-base font-bold tabular-nums text-leaf-900">{item.value}</div>
          <div className="text-xs text-ink-500">{item.label}</div>
        </AppCard>
      ))}
    </div>
  )
}
