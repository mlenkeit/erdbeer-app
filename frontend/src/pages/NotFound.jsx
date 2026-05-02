import { Link, useParams } from 'react-router-dom'

export default function NotFound() {
  const { token } = useParams()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text mb-2">Seite nicht gefunden</h1>
        <p className="text-sm text-text-secondary mb-4">
          Diese Seite existiert nicht.
        </p>
        {token && (
          <Link
            to={`/${token}`}
            className="inline-block px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
          >
            Zurück zur Startseite
          </Link>
        )}
      </div>
    </div>
  )
}
