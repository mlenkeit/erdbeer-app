export function formatGrams(grams) {
  if (grams >= 1000) {
    const kg = grams / 1000
    const formatted = kg.toLocaleString('de-DE', {
      minimumFractionDigits: kg % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    })
    return `${formatted} kg`
  }
  return `${grams.toLocaleString('de-DE')} g`
}

export function formatPrice(cents) {
  const euros = cents / 100
  return `${euros.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}
