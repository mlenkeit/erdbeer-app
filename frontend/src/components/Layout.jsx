import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { isSeasonEnded } from '../utils/season'
import { DecorativeBerry } from './DecorativeBerry'
import { EmptyState } from './EmptyState'

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

export default function Layout() {
  const { token, group, season, loading, error } = useToken()
  const location = useLocation()

  const isFormPage = location.pathname.includes('/erfassen') || location.pathname.includes('/einkauf/')
  const seasonEnded = isSeasonEnded(season)

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-100 flex items-center justify-center">
        <div className="animate-pulse text-ink-500">Laden...</div>
      </div>
    )
  }

  if (error) {
    const isNotFound = error.code === 'GROUP_NOT_FOUND'
    return (
      <div className="min-h-dvh bg-cream-100 flex items-center justify-center px-4">
        <EmptyState
          title={isNotFound ? 'Ungültiger Einladungslink' : 'Etwas ist schiefgelaufen'}
          description={isNotFound
            ? 'Bitte prüfe den Link oder lass dir einen neuen schicken.'
            : error.message || 'Bitte versuche es erneut.'}
          action={!isNotFound ? (
            <button
              onClick={() => window.location.reload()}
              className="min-h-12 rounded-2xl bg-strawberry-500 px-5 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(233,67,74,0.28)] transition active:scale-[0.98]"
            >
              Nochmal versuchen
            </button>
          ) : undefined}
        />
      </div>
    )
  }

  if (isFormPage) {
    return (
      <div className="min-h-dvh bg-cream-100">
        <main className="max-w-md mx-auto px-4 py-4">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      <header className="px-4 pt-4 pb-3 max-w-md mx-auto w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-leaf-600">Erdbeer-Saison</p>
            <h1 className="font-heading text-2xl text-leaf-900 tracking-tight truncate">{group?.name}</h1>
            {season && (
              <p className="mt-0.5 text-sm text-leaf-700">{season.name}</p>
            )}
          </div>
          <DecorativeBerry className="h-10 w-10 shrink-0 drop-shadow-sm" />
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-4 flex-1">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/70 bg-white/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(80,40,20,0.08)] backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <div className={`mx-auto grid max-w-md gap-1 ${seasonEnded ? 'grid-cols-3' : 'grid-cols-4'}`}>
          <NavLink
            to={`/${token}`}
            end
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium ${
                isActive ? 'bg-blush-100 text-strawberry-600' : 'text-ink-500'
              }`
            }
          >
            <HouseIcon className="h-5 w-5" />
            <span>Home</span>
          </NavLink>
          {!seasonEnded && (
            <NavLink
              to={`/${token}/erfassen`}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium ${
                  isActive ? 'bg-blush-100 text-strawberry-600' : 'text-strawberry-500'
                }`
              }
            >
              <PlusIcon className="h-5 w-5" />
              <span>Erfassen</span>
            </NavLink>
          )}
          <NavLink
            to={`/${token}/verlauf`}
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium ${
                isActive ? 'bg-blush-100 text-strawberry-600' : 'text-ink-500'
              }`
            }
          >
            <ListIcon className="h-5 w-5" />
            <span>Verlauf</span>
          </NavLink>
          <NavLink
            to={`/${token}/rangliste`}
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium ${
                isActive ? 'bg-blush-100 text-strawberry-600' : 'text-ink-500'
              }`
            }
          >
            <TrophyIcon className="h-5 w-5" />
            <span>Rangliste</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
