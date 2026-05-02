import { useState, useRef } from 'react'

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <fieldset>
      {label && <legend className="mb-2 text-sm font-semibold text-leaf-900">{label}</legend>}
      <div className="grid rounded-2xl bg-cream-200 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors min-h-[44px] ${
              value === opt.value
                ? 'bg-strawberry-500 text-white shadow-sm'
                : 'text-ink-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function NumberStepper({ value, onChange, min = 1, max = 99, label, id }) {
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  function handleDecrement() {
    if (value > min) onChange(value - 1)
  }

  function handleIncrement() {
    if (value < max) onChange(value + 1)
  }

  function handleCenterTap() {
    setInputValue(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function handleInputBlur() {
    setEditing(false)
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
    } else {
      setInputValue(String(value))
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
  }

  return (
    <div>
      {label && <label htmlFor={id} className="mb-2 block text-sm font-semibold text-leaf-900">{label}</label>}
      <div className="grid min-h-12 grid-cols-3 overflow-hidden rounded-2xl border border-cream-300 bg-white">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="flex items-center justify-center text-xl font-semibold text-strawberry-500 disabled:opacity-30"
          aria-label="Weniger"
        >
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="text-center text-lg font-semibold tabular-nums text-ink-900 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={handleCenterTap}
            className="flex items-center justify-center text-lg font-semibold tabular-nums text-ink-900"
            aria-label={`Menge: ${value}, tippen zum Bearbeiten`}
          >
            {value}
          </button>
        )}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="flex items-center justify-center text-xl font-semibold text-strawberry-500 disabled:opacity-30"
          aria-label="Mehr"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function PriceInput({ value, onChange, error, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-leaf-900">Preis</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className={`min-h-12 w-full rounded-xl border bg-white px-4 pr-14 text-base text-ink-900 shadow-[0_2px_8px_rgba(80,40,20,0.04)] placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-strawberry-100 ${
            error ? 'border-strawberry-600 focus:border-strawberry-600' : 'border-cream-300 focus:border-strawberry-300'
          }`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">EUR</span>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-strawberry-700">{error}</p>
      )}
    </div>
  )
}
