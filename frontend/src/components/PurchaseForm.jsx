import { useState } from 'react'
import { SegmentedControl, NumberStepper, PriceInput } from './FormInputs'
import { CloseIcon } from './Icons'
import { AppCard } from './AppCard'
import { PRICE_PATTERN, parsePriceToCents } from '../utils/price'

function createEmptyItem() {
  return {
    bagSizeGrams: 500,
    quantity: 1,
    priceDisplay: '',
    priceUnit: '500g',
  }
}

function priceDisplayFromCents(cents) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function initItems(initialData) {
  if (!initialData?.items?.length) return [createEmptyItem()]
  return initialData.items.map((item) => ({
    bagSizeGrams: item.bagSizeGrams,
    quantity: item.quantity,
    priceDisplay: priceDisplayFromCents(item.priceCents),
    priceUnit: item.priceUnit,
  }))
}

export default function PurchaseForm({ season, onSubmit, onDelete, initialData, showDelete = false }) {
  const today = new Date().toISOString().split('T')[0]
  const defaultDate = initialData?.purchasedAt || today

  const [date, setDate] = useState(defaultDate)
  const [items, setItems] = useState(() => initItems(initialData))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canAddItem = items.length < 20

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    if (canAddItem) {
      setItems((prev) => [...prev, createEmptyItem()])
    }
  }

  function removeItem(index) {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  function validateDate() {
    if (!season) return null
    if (date < season.startDate || date > season.endDate) {
      return 'Datum muss innerhalb der Saison liegen'
    }
    return null
  }

  function validatePrice(display) {
    if (!display) return 'Bitte einen Preis eingeben'
    if (!PRICE_PATTERN.test(display)) return 'Bitte einen gültigen Preis eingeben'
    const cents = parsePriceToCents(display)
    if (cents < 1 || cents > 99999) return 'Preis muss zwischen 0,01 und 999,99 EUR liegen'
    return null
  }

  const dateError = validateDate()
  const itemErrors = items.map((item) => ({
    price: validatePrice(item.priceDisplay),
  }))
  const isValid = !dateError && itemErrors.every((e) => !e.price)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    const payload = {
      purchasedAt: date,
      items: items.map((item) => ({
        bagSizeGrams: item.bagSizeGrams,
        quantity: item.quantity,
        priceCents: parsePriceToCents(item.priceDisplay),
        priceUnit: item.priceUnit,
      })),
    }

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <AppCard className="border-strawberry-200 bg-blush-50 px-4 py-3" role="alert">
          <p className="text-sm text-strawberry-700">{error}</p>
        </AppCard>
      )}

      <AppCard className="space-y-4 p-4">
        <label htmlFor="purchase-date" className="block text-sm font-semibold text-leaf-900">Datum</label>
        <input
          id="purchase-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={season?.startDate}
          max={season?.endDate}
          className={`min-h-12 w-full rounded-xl border bg-white px-4 text-base text-ink-900 shadow-[0_2px_8px_rgba(80,40,20,0.04)] focus:outline-none focus:ring-2 focus:ring-strawberry-100 ${
            dateError ? 'border-strawberry-600' : 'border-cream-300 focus:border-strawberry-300'
          }`}
          aria-invalid={dateError ? 'true' : undefined}
          aria-describedby={dateError ? 'date-error' : undefined}
        />
        {dateError && (
          <p id="date-error" className="text-xs text-strawberry-700">{dateError}</p>
        )}
      </AppCard>

      <AppCard className="space-y-4 p-4">
        <h2 className="text-base font-semibold text-leaf-900">Was hast du gekauft?</h2>

        {items.map((item, index) => (
          <div key={index} className="space-y-4 relative rounded-xl bg-cream-50 p-3">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center text-ink-500"
                aria-label={`Position ${index + 1} entfernen`}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}

            {items.length > 1 && (
              <p className="text-xs font-medium text-ink-500">Position {index + 1}</p>
            )}

            <SegmentedControl
              label="Beutelgröße"
              options={[
                { value: 250, label: '250g' },
                { value: 500, label: '500g' },
              ]}
              value={item.bagSizeGrams}
              onChange={(v) => updateItem(index, 'bagSizeGrams', v)}
            />

            <NumberStepper
              label="Anzahl"
              id={`quantity-${index}`}
              value={item.quantity}
              onChange={(v) => updateItem(index, 'quantity', v)}
              min={1}
              max={99}
            />

            <PriceInput
              id={`price-${index}`}
              value={item.priceDisplay}
              onChange={(v) => updateItem(index, 'priceDisplay', v)}
              error={item.priceDisplay ? itemErrors[index].price : null}
            />

            <SegmentedControl
              label="Preis gilt für..."
              options={[
                { value: 'kg', label: 'pro kg' },
                { value: '500g', label: 'pro 500g' },
                { value: '250g', label: 'pro 250g' },
              ]}
              value={item.priceUnit}
              onChange={(v) => updateItem(index, 'priceUnit', v)}
            />
          </div>
        ))}

        {canAddItem ? (
          <button
            type="button"
            onClick={addItem}
            className="min-h-12 w-full rounded-xl border border-cream-300 py-3 text-sm font-semibold text-leaf-900"
          >
            + Weitere Position
          </button>
        ) : (
          <p className="text-center text-xs text-ink-500">Maximal 20 Positionen pro Einkauf.</p>
        )}
      </AppCard>

      <div className="flex gap-3">
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="min-h-12 rounded-xl border border-strawberry-200 bg-white px-4 py-3 text-sm font-semibold text-strawberry-700 disabled:opacity-50"
          >
            Löschen
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="min-h-12 flex-1 rounded-2xl bg-strawberry-500 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(233,67,74,0.28)] transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          )}
          Speichern
        </button>
      </div>
    </form>
  )
}
