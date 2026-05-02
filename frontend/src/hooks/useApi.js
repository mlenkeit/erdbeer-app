import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(fetchFn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchFn()
      .then((result) => {
        if (mountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err)
          setLoading(false)
        }
      })
  }, [fetchFn])

  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount is intentional
    refetch()
    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { data, loading, error, refetch }
}
