import { createContext, useContext, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getGroup } from '../api'
import { useApi } from '../hooks/useApi'

const TokenContext = createContext(null)

export function TokenProvider({ children }) {
  const { token } = useParams()
  const fetchGroup = useCallback(() => getGroup(token), [token])
  const { data, loading, error, refetch } = useApi(fetchGroup)

  const value = {
    token,
    group: data ? { id: data.id, name: data.name } : null,
    season: data?.season || null,
    stats: data ? {
      totalGrams: data.totalGrams,
      purchaseCount: data.purchaseCount,
      avgPricePerKgCents: data.avgPricePerKgCents,
    } : null,
    loading,
    error,
    refetch,
  }

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  )
}

export function useToken() {
  const ctx = useContext(TokenContext)
  if (!ctx) {
    throw new Error('useToken must be used within TokenProvider')
  }
  return ctx
}
