import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export default function NotFound() {
  const { token } = useParams()

  return (
    <div className="min-h-dvh bg-cream-100 flex items-center justify-center px-4">
      <EmptyState
        title="Seite nicht gefunden"
        description="Diese Seite existiert nicht."
        action={token ? (
          <Link
            to={`/${token}`}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-strawberry-500 px-5 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(233,67,74,0.28)] transition active:scale-[0.98]"
          >
            Zurück zur Startseite
          </Link>
        ) : undefined}
      />
    </div>
  )
}
