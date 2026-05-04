import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { createPurchase } from '../api'
import PurchaseForm from '../components/PurchaseForm'
import { ArrowLeftIcon } from '../components/Icons'
import { DecorativeBerry } from '../components/DecorativeBerry'
import { AppCard } from '../components/AppCard'
import { SkeletonCard } from '../components/Skeleton'

export default function NewPurchase() {
  const { token, season, loading } = useToken()
  const navigate = useNavigate()
  const [seasonEnded, setSeasonEnded] = useState(false)

  async function handleSubmit(payload) {
    try {
      await createPurchase(token, payload)
      navigate(`/${token}?success=saved`, { replace: true })
    } catch (err) {
      if (err.code === 'SEASON_ENDED') {
        setSeasonEnded(true)
      }
      throw err
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between pt-4">
        <Link to={`/${token}`} className="flex h-11 w-11 items-center justify-center -ml-2" aria-label="Zurück">
          <ArrowLeftIcon className="h-5 w-5 text-ink-700" />
        </Link>
        <h1 className="font-heading text-2xl text-leaf-900">Einkauf erfassen</h1>
        <DecorativeBerry className="h-8 w-8" />
      </div>

      {seasonEnded && (
        <AppCard className="mb-4 border-strawberry-200 bg-blush-50 px-4 py-3">
          <p className="text-sm font-medium text-strawberry-700">Die Saison ist beendet!</p>
        </AppCard>
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <PurchaseForm season={season} onSubmit={handleSubmit} />
      )}
    </div>
  )
}
