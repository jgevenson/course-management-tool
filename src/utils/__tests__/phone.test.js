import { describe, it, expect } from 'vitest'
import { formatPhoneNumber, formatPhoneNumberAsYouType } from '../phone'

describe('Phone Utility', () => {
  describe('formatPhoneNumber', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(formatPhoneNumber(null)).toBe('')
      expect(formatPhoneNumber(undefined)).toBe('')
      expect(formatPhoneNumber('')).toBe('')
    })

    it('formats a clean 10-digit string', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
    })

    it('formats an already formatted or punctuated 10-digit string', () => {
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890')
      expect(formatPhoneNumber('(123) 4567890')).toBe('(123) 456-7890')
    })

    it('formats an 11-digit string starting with 1', () => {
      expect(formatPhoneNumber('11234567890')).toBe('(123) 456-7890')
      expect(formatPhoneNumber('1-123-456-7890')).toBe('(123) 456-7890')
    })

    it('returns original input if it is not a standard 10 or 11 digit US number', () => {
      expect(formatPhoneNumber('12345')).toBe('12345')
      expect(formatPhoneNumber('+44 20 7946 0192')).toBe('+44 20 7946 0192')
    })
  })

  describe('formatPhoneNumberAsYouType', () => {
    it('returns empty string for empty input', () => {
      expect(formatPhoneNumberAsYouType('')).toBe('')
    })

    it('returns raw digits for 3 or fewer characters', () => {
      expect(formatPhoneNumberAsYouType('1')).toBe('1')
      expect(formatPhoneNumberAsYouType('12')).toBe('12')
      expect(formatPhoneNumberAsYouType('123')).toBe('123')
    })

    it('inserts parenthesis and spaces for 4 to 6 characters', () => {
      expect(formatPhoneNumberAsYouType('1234')).toBe('(123) 4')
      expect(formatPhoneNumberAsYouType('12345')).toBe('(123) 45')
      expect(formatPhoneNumberAsYouType('123456')).toBe('(123) 456')
    })

    it('inserts parenthesis, space, and hyphen for 7 to 10 characters', () => {
      expect(formatPhoneNumberAsYouType('1234567')).toBe('(123) 456-7')
      expect(formatPhoneNumberAsYouType('12345678')).toBe('(123) 456-78')
      expect(formatPhoneNumberAsYouType('1234567890')).toBe('(123) 456-7890')
    })

    it('truncates inputs longer than 10 characters', () => {
      expect(formatPhoneNumberAsYouType('12345678901234')).toBe('(123) 456-7890')
    })
  })
})
