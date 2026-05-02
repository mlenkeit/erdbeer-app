import { useState, useEffect } from 'react'
import { DecorativeBerry } from './DecorativeBerry'

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!visible) return null

  const styles = type === 'success'
    ? 'border-leaf-200 bg-white'
    : 'border-strawberry-200 bg-blush-50'

  return (
    <div
      role="alert"
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-50 rounded-2xl border px-4 py-3 shadow-lg ${styles}`}
    >
      <div className="flex items-center gap-3">
        <DecorativeBerry className="h-6 w-6 shrink-0" />
        <span className={`flex-1 text-sm font-semibold ${type === 'success' ? 'text-leaf-900' : 'text-strawberry-700'}`}>
          {message}
        </span>
        <button
          onClick={() => {
            setVisible(false)
            onClose?.()
          }}
          className="text-ink-500"
          aria-label="Schließen"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
