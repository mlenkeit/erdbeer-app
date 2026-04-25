import { describe, it, expect } from 'vitest'
import { parsePriceToCents, PRICE_PATTERN } from './PurchaseForm'

describe('parsePriceToCents', () => {
  it('converts comma decimal to cents', () => {
    expect(parsePriceToCents('3,99')).toBe(399)
  })

  it('converts period decimal to cents', () => {
    expect(parsePriceToCents('3.99')).toBe(399)
  })

  it('converts whole number to cents', () => {
    expect(parsePriceToCents('4')).toBe(400)
  })

  it('converts single decimal place', () => {
    expect(parsePriceToCents('3,5')).toBe(350)
  })

  it('handles rounding correctly', () => {
    expect(parsePriceToCents('1,01')).toBe(101)
    expect(parsePriceToCents('999,99')).toBe(99999)
  })
})

describe('PRICE_PATTERN', () => {
  it('accepts valid prices', () => {
    expect(PRICE_PATTERN.test('3,99')).toBe(true)
    expect(PRICE_PATTERN.test('3.99')).toBe(true)
    expect(PRICE_PATTERN.test('4')).toBe(true)
    expect(PRICE_PATTERN.test('12,5')).toBe(true)
    expect(PRICE_PATTERN.test('999,99')).toBe(true)
  })

  it('rejects invalid prices', () => {
    expect(PRICE_PATTERN.test('3,99,99')).toBe(false)
    expect(PRICE_PATTERN.test('')).toBe(false)
    expect(PRICE_PATTERN.test('3,999')).toBe(false)
    expect(PRICE_PATTERN.test('1234')).toBe(false)
    expect(PRICE_PATTERN.test('abc')).toBe(false)
  })
})
