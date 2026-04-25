function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function isSeasonEnded(season) {
  if (!season) return false
  return season.endDate < todayISO()
}

export function isBeforeSeasonStart(season) {
  if (!season) return false
  return season.startDate > todayISO()
}

export function seasonDaysLeft(season) {
  if (!season) return 0
  const today = new Date(todayISO() + 'T00:00:00')
  const end = new Date(season.endDate + 'T00:00:00')
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export function seasonProgress(season) {
  if (!season) return 0
  const start = new Date(season.startDate + 'T00:00:00')
  const end = new Date(season.endDate + 'T00:00:00')
  const now = new Date(todayISO() + 'T00:00:00')
  const total = end - start
  const elapsed = now - start
  return Math.min(1, Math.max(0, elapsed / total))
}
