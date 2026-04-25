import { useState } from 'react'
import { SegmentedControl, NumberStepper, PriceInput } from './FormInputs'
import { CloseIcon } from './Icons'

export const PRICE_PATTERN = /^\d{1,3}([,.]\d{1,2})?$/

export function parsePriceToCents(value) {
  const normalized = value.replace(',', '.')
  return Math.round(parseFloat(normalized) * 100)
}

function createEmptyItem() {
  return {
    bagSizeGrams: 500,
    quantity: 1,
    priceDisplay: '',
    priceUnit: '500g',
  }
}

function formatDateForInput(isoDate) {
  return isoDate
}

function priceDisplayFromCents(cents, unit) {
  const unitGrams = unit === 'kg' ? 1000 : unit === '500g' ? 500 : 250
  const perUnit = cents * unitGrams / 1000
  const euros = perUnit / 100
  return euros.toFixed(2).replace('.', ',')
}

function initItems(initialData) {
  if (!initialData?.items?.length) return [createEmptyItem()]
  return initialData.items.map((item) => ({
    bagSizeGrams: item.bagSizeGrams,
    quantity: item.quantity,
    priceDisplay: priceDisplayFromCents(item.priceCents, item.priceUnit),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="purchase-date" className="text-xs font-medium text-text-secondary mb-1 block">Datum</label>
        <input
          id="purchase-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={season?.startDate}
          max={season?.endDate}
          className={`w-full h-12 px-3 text-base border rounded-lg bg-surface ${
            dateError ? 'border-error' : 'border-gray-200'
          }`}
          aria-invalid={dateError ? 'true' : undefined}
          aria-describedby={dateError ? 'date-error' : undefined}
        />
        {dateError && (
          <p id="date-error" className="text-xs text-error mt-1">{dateError}</p>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-text">Was hast du gekauft?</p>

        {items.map((item, index) => (
          <div key={index} className="bg-surface rounded-xl shadow-sm p-3 space-y-3 relative">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-text-secondary"
                aria-label={`Position ${index + 1} entfernen`}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}

            {items.length > 1 && (
              <p className="text-xs text-text-secondary">Position {index + 1}</p>
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
            className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-text-secondary min-h-[48px]"
          >
            + Weitere Position
          </button>
        ) : (
          <p className="text-xs text-text-secondary text-center">Maximal 20 Positionen pro Einkauf.</p>
        )}
      </div>

      <div className="flex gap-3">
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="py-3 px-6 border border-error text-error rounded-xl text-sm font-medium min-h-[48px] disabled:opacity-50"
          >
            Löschen
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          )}
          Speichern
        </button>
      </div>
    </form>
  )
}
