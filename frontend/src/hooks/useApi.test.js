import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApi } from './useApi'

describe('useApi', () => {
  it('fetches data on mount and returns it', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' })
    const { result } = renderHook(() => useApi(fetchFn))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual({ id: 1, name: 'Test' })
    expect(result.current.error).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('sets error on fetch failure', async () => {
    const error = new Error('fail')
    const fetchFn = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useApi(fetchFn))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(error)
  })

  it('refetch re-fetches data', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
    const { result } = renderHook(() => useApi(fetchFn))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual({ count: 1 })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 2 })
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
