import { describe, it, expect } from 'vitest'
import { formatGrams, formatPrice, formatDate } from './format'

describe('formatGrams', () => {
  it('formats grams below 1000 as g', () => {
    expect(formatGrams(750)).toBe('750 g')
  })

  it('formats 0 grams', () => {
    expect(formatGrams(0)).toBe('0 g')
  })

  it('formats 1000 grams as 1 kg', () => {
    expect(formatGrams(1000)).toBe('1 kg')
  })

  it('formats 1500 grams as 1,5 kg', () => {
    expect(formatGrams(1500)).toBe('1,5 kg')
  })

  it('formats 2500 grams as 2,5 kg', () => {
    expect(formatGrams(2500)).toBe('2,5 kg')
  })

  it('formats large amounts with thousands separator', () => {
    expect(formatGrams(10000)).toBe('10 kg')
  })

  it('formats 500 grams', () => {
    expect(formatGrams(500)).toBe('500 g')
  })

  it('formats 250 grams', () => {
    expect(formatGrams(250)).toBe('250 g')
  })

  it('formats 4500 grams as 4,5 kg', () => {
    expect(formatGrams(4500)).toBe('4,5 kg')
  })
})

describe('formatPrice', () => {
  it('formats price in cents to EUR with comma', () => {
    expect(formatPrice(399)).toBe('3,99 EUR')
  })

  it('formats 0 cents', () => {
    expect(formatPrice(0)).toBe('0,00 EUR')
  })

  it('formats whole euro amounts', () => {
    expect(formatPrice(500)).toBe('5,00 EUR')
  })

  it('formats large amounts', () => {
    expect(formatPrice(1299)).toBe('12,99 EUR')
  })

  it('formats single-digit cent amounts', () => {
    expect(formatPrice(5)).toBe('0,05 EUR')
  })
})

describe('formatDate', () => {
  it('formats ISO date to German format', () => {
    expect(formatDate('2026-05-10')).toBe('10.05.2026')
  })

  it('formats January date', () => {
    expect(formatDate('2026-01-01')).toBe('01.01.2026')
  })

  it('formats December date', () => {
    expect(formatDate('2026-12-31')).toBe('31.12.2026')
  })
})
