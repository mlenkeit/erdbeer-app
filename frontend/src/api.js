const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

async function request(method, path, body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  const options = {
    method,
    signal: controller.signal,
    headers: {},
  }

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Keine Verbindung zum Server. Bitte versuche es erneut.')
    }
    throw new ApiError('NETWORK_ERROR', 'Keine Verbindung zum Server. Bitte versuche es erneut.')
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 204) {
    return null
  }

  const json = await response.json()

  if (!response.ok) {
    const err = json.error || {}
    throw new ApiError(err.code || 'UNKNOWN', err.message || 'Etwas ist schiefgelaufen')
  }

  return json.data
}

export function getGroup(token) {
  return request('GET', `/group/${token}`)
}

export function getLeaderboard(token) {
  return request('GET', `/leaderboard/${token}`)
}

export function getPurchases(token) {
  return request('GET', `/purchases/${token}`)
}

export function createPurchase(token, data) {
  return request('POST', `/purchases/${token}`, data)
}

export function getPurchase(token, id) {
  return request('GET', `/purchases/${token}/${id}`)
}

export function updatePurchase(token, id, data) {
  return request('PUT', `/purchases/${token}/${id}`, data)
}

export function deletePurchase(token, id) {
  return request('DELETE', `/purchases/${token}/${id}`)
}

export { ApiError }
