import { useState, useEffect } from 'react'

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

  return (
    <div
      role="alert"
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-50 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between ${
        type === 'success' ? 'bg-secondary text-white' : 'bg-error text-white'
      }`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setVisible(false)
          onClose?.()
        }}
        className="ml-3 text-white/80 hover:text-white"
        aria-label="Schließen"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
