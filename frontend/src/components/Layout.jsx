import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useToken } from '../context/TokenContext'

function HouseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function TrophyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function isSeasonEnded(season) {
  if (!season) return false
  return new Date(season.endDate) < new Date(new Date().toISOString().split('T')[0])
}

export default function Layout() {
  const { token, group, season, loading, error } = useToken()
  const location = useLocation()

  const isFormPage = location.pathname.includes('/erfassen') || location.pathname.includes('/einkauf/')
  const seasonEnded = isSeasonEnded(season)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Laden...</div>
      </div>
    )
  }

  if (error) {
    const isNotFound = error.code === 'GROUP_NOT_FOUND'
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-2">
            {isNotFound ? 'Ungültiger Einladungslink' : 'Etwas ist schiefgelaufen'}
          </h1>
          <p className="text-sm text-text-secondary mb-4">
            {isNotFound
              ? 'Dieser Link ist ungültig oder abgelaufen.'
              : error.message || 'Bitte versuche es erneut.'}
          </p>
          {!isNotFound && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
            >
              Nochmal versuchen
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isFormPage) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-md mx-auto px-4 py-4">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      <header className="bg-surface border-b border-gray-100 px-4 py-3 max-w-md mx-auto w-full">
        <h1 className="text-lg font-semibold text-text truncate">{group?.name}</h1>
        {season && (
          <p className="text-xs text-text-secondary">{season.name}</p>
        )}
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-4 flex-1">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-100" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-md mx-auto flex">
          <NavLink
            to={`/${token}`}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary' : 'text-text-secondary'}`
            }
          >
            <HouseIcon className="w-6 h-6 mb-0.5" />
            <span>Home</span>
          </NavLink>
          {!seasonEnded && (
            <NavLink
              to={`/${token}/erfassen`}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary' : 'text-primary/70'}`
              }
            >
              <PlusIcon className="w-6 h-6 mb-0.5" />
              <span>Erfassen</span>
            </NavLink>
          )}
          <NavLink
            to={`/${token}/verlauf`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary' : 'text-text-secondary'}`
            }
          >
            <ListIcon className="w-6 h-6 mb-0.5" />
            <span>Verlauf</span>
          </NavLink>
          <NavLink
            to={`/${token}/rangliste`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary' : 'text-text-secondary'}`
            }
          >
            <TrophyIcon className="w-6 h-6 mb-0.5" />
            <span>Rangliste</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
