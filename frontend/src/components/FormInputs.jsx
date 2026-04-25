import { useState, useRef } from 'react'

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <fieldset>
      {label && <legend className="text-xs font-medium text-text-secondary mb-1">{label}</legend>}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              value === opt.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary'
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
      {label && <label htmlFor={id} className="text-xs font-medium text-text-secondary mb-1 block">{label}</label>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 text-text font-bold text-lg disabled:opacity-30"
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
            className="w-12 h-11 text-center text-sm font-semibold border border-gray-200 rounded-lg tabular-nums"
          />
        ) : (
          <button
            type="button"
            onClick={handleCenterTap}
            className="w-12 h-11 text-center text-sm font-semibold tabular-nums border border-gray-200 rounded-lg"
            aria-label={`Menge: ${value}, tippen zum Bearbeiten`}
          >
            {value}
          </button>
        )}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 text-text font-bold text-lg disabled:opacity-30"
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
      <label htmlFor={id} className="text-xs font-medium text-text-secondary mb-1 block">Preis</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className={`w-full h-12 px-3 pr-14 text-base border rounded-lg bg-surface ${
            error ? 'border-error' : 'border-gray-200'
          }`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">EUR</span>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-error mt-1">{error}</p>
      )}
    </div>
  )
}
