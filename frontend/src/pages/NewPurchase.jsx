import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { createPurchase } from '../api'
import PurchaseForm from '../components/PurchaseForm'
import { ArrowLeftIcon } from '../components/Icons'
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
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/${token}`} className="w-11 h-11 flex items-center justify-center -ml-2" aria-label="Zurück">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-text">Einkauf erfassen</h1>
      </div>

      {seasonEnded && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-4 py-3 mb-4">
          Die Saison ist beendet!
        </div>
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <PurchaseForm season={season} onSubmit={handleSubmit} />
      )}
    </div>
  )
}
