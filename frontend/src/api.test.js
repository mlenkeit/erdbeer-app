import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGroup, getLeaderboard, getPurchases, createPurchase, getPurchase, updatePurchase, deletePurchase, ApiError } from './api'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('api client', () => {
  it('getGroup unwraps data envelope', async () => {
    const groupData = { id: 1, name: 'Test' }
    fetch.mockReturnValue(mockResponse(200, { data: groupData }))

    const result = await getGroup('abc123')
    expect(result).toEqual(groupData)
    expect(fetch).toHaveBeenCalledWith(
      '/api/group/abc123',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('getLeaderboard calls correct endpoint', async () => {
    fetch.mockReturnValue(mockResponse(200, { data: { leaderboard: [] } }))
    await getLeaderboard('token1')
    expect(fetch).toHaveBeenCalledWith(
      '/api/leaderboard/token1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('getPurchases calls correct endpoint', async () => {
    fetch.mockReturnValue(mockResponse(200, { data: { purchases: [] } }))
    await getPurchases('token1')
    expect(fetch).toHaveBeenCalledWith(
      '/api/purchases/token1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('createPurchase sends POST with body and Content-Type', async () => {
    const body = { purchasedAt: '2026-05-10', items: [] }
    fetch.mockReturnValue(mockResponse(201, { data: { id: 1 } }))

    await createPurchase('token1', body)
    const [, opts] = fetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual(body)
  })

  it('getPurchase calls correct endpoint', async () => {
    fetch.mockReturnValue(mockResponse(200, { data: { id: 5 } }))
    await getPurchase('token1', 5)
    expect(fetch).toHaveBeenCalledWith(
      '/api/purchases/token1/5',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updatePurchase sends PUT with body', async () => {
    const body = { purchasedAt: '2026-05-11', items: [] }
    fetch.mockReturnValue(mockResponse(200, { data: { id: 5 } }))

    await updatePurchase('token1', 5, body)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/purchases/token1/5')
    expect(opts.method).toBe('PUT')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('deletePurchase returns null for 204', async () => {
    fetch.mockReturnValue(
      Promise.resolve({ ok: true, status: 204 })
    )

    const result = await deletePurchase('token1', 5)
    expect(result).toBeNull()
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/purchases/token1/5')
    expect(opts.method).toBe('DELETE')
  })

  it('throws ApiError with code and message on error response', async () => {
    fetch.mockReturnValue(
      mockResponse(404, { error: { code: 'GROUP_NOT_FOUND', message: 'Gruppe nicht gefunden' } })
    )

    await expect(getGroup('bad')).rejects.toThrow(ApiError)
    try {
      await getGroup('bad')
    } catch (err) {
      expect(err.code).toBe('GROUP_NOT_FOUND')
      expect(err.message).toBe('Gruppe nicht gefunden')
    }
  })

  it('throws ApiError on network failure', async () => {
    fetch.mockReturnValue(Promise.reject(new TypeError('Failed to fetch')))

    await expect(getGroup('token1')).rejects.toThrow(ApiError)
    try {
      await getGroup('token1')
    } catch (err) {
      expect(err.code).toBe('NETWORK_ERROR')
    }
  })
})
