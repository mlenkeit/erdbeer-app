export const PRICE_PATTERN = /^\d{1,3}([,.]\d{1,2})?$/

export function parsePriceToCents(value) {
  const normalized = value.replace(',', '.')
  return Math.round(parseFloat(normalized) * 100)
}
