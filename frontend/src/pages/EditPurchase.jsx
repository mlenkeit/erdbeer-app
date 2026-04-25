import { useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { getPurchase, updatePurchase, deletePurchase } from '../api'
import { useApi } from '../hooks/useApi'
import PurchaseForm from '../components/PurchaseForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { ArrowLeftIcon } from '../components/Icons'
import { SkeletonCard } from '../components/Skeleton'

export default function EditPurchase() {
  const { token, season } = useToken()
  const { id } = useParams()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [seasonEnded, setSeasonEnded] = useState(false)

  const fetchPurchase = useCallback(() => getPurchase(token, id), [token, id])
  const { data: purchase, loading, error, refetch } = useApi(fetchPurchase)

  async function handleSubmit(payload) {
    try {
      await updatePurchase(token, id, payload)
      navigate(`/${token}?success=saved`, { replace: true })
    } catch (err) {
      if (err.code === 'SEASON_ENDED') {
        setSeasonEnded(true)
      }
      throw err
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deletePurchase(token, id)
      navigate(`/${token}?success=deleted`, { replace: true })
    } catch (err) {
      setDeleting(false)
      if (err.code === 'SEASON_ENDED') {
        setSeasonEnded(true)
        setShowDeleteDialog(false)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/${token}/verlauf`} className="w-11 h-11 flex items-center justify-center -ml-2" aria-label="Zurück">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-text">Einkauf bearbeiten</h1>
      </div>

      {seasonEnded && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-4 py-3 mb-4">
          Die Saison ist beendet!
        </div>
      )}

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-xl px-4 py-3">
          <p>{error.message || 'Einkauf nicht gefunden'}</p>
          <button onClick={refetch} className="mt-2 text-sm font-medium underline">Nochmal versuchen</button>
        </div>
      ) : purchase ? (
        <>
          <PurchaseForm
            season={season}
            initialData={purchase}
            onSubmit={handleSubmit}
            onDelete={() => setShowDeleteDialog(true)}
            showDelete
          />
          {showDeleteDialog && (
            <ConfirmDialog
              title="Einkauf löschen?"
              message="Dieser Einkauf wird unwiderruflich gelöscht."
              confirmLabel={deleting ? 'Löschen...' : 'Löschen'}
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteDialog(false)}
              destructive
            />
          )}
        </>
      ) : null}
    </div>
  )
}
