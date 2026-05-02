import { useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToken } from '../context/TokenContext'
import { getPurchase, updatePurchase, deletePurchase } from '../api'
import { useApi } from '../hooks/useApi'
import PurchaseForm from '../components/PurchaseForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { ArrowLeftIcon } from '../components/Icons'
import { DecorativeBerry } from '../components/DecorativeBerry'
import { AppCard } from '../components/AppCard'
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
      <div className="mb-5 flex items-center justify-between pt-4">
        <Link to={`/${token}/verlauf`} className="flex h-11 w-11 items-center justify-center -ml-2" aria-label="Zurück">
          <ArrowLeftIcon className="h-5 w-5 text-ink-700" />
        </Link>
        <h1 className="font-heading text-2xl text-leaf-900">Einkauf bearbeiten</h1>
        <DecorativeBerry className="h-8 w-8" />
      </div>

      {seasonEnded && (
        <AppCard className="mb-4 border-strawberry-200 bg-blush-50 px-4 py-3">
          <p className="text-sm font-medium text-strawberry-700">Die Saison ist beendet!</p>
        </AppCard>
      )}

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <AppCard className="p-4">
          <p className="text-sm text-strawberry-700">{error.message || 'Einkauf nicht gefunden'}</p>
          <button onClick={refetch} className="mt-2 text-sm font-semibold text-strawberry-600 underline">Nochmal versuchen</button>
        </AppCard>
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
