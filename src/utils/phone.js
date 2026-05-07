/**
 * Formats a phone number string to a standard US/Canada format: (123) 456-7890.
 *
 * @param {string|number} value - The raw phone number.
 * @returns {string} The formatted phone number, or the original string if invalid/unmatchable.
 *
 * @example
 * formatPhoneNumber('1234567890') // => '(123) 456-7890'
 * formatPhoneNumber('11234567890') // => '(123) 456-7890'
 * formatPhoneNumber('123-456-7890') // => '(123) 456-7890'
 */
export const formatPhoneNumber = (value) => {
  if (!value) return ''

  // Convert to string and remove all non-digits
  const cleaned = String(value).replace(/\D/g, '')

  // 10 digits: (123) 456-7890
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // 11 digits starting with 1: (123) 456-7890
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // Return original value if it doesn't match standard 10/11 digit format
  return String(value)
}

/**
 * Formats a phone number dynamically as the user types.
 * Useful for controlled inputs (onChange handlers) to provide immediate, friendly feedback.
 *
 * @param {string} value - The input value being typed.
 * @returns {string} The progressively formatted string.
 *
 * @example
 * formatPhoneNumberAsYouType('123') // => '123'
 * formatPhoneNumberAsYouType('1234') // => '(123) 4'
 * formatPhoneNumberAsYouType('123456') // => '(123) 456'
 * formatPhoneNumberAsYouType('1234567') // => '(123) 456-7'
 * formatPhoneNumberAsYouType('1234567890') // => '(123) 456-7890'
 */
export const formatPhoneNumberAsYouType = (value) => {
  if (!value) return ''

  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '')

  // Limit input to max 10 digits for standard US format
  const truncated = cleaned.slice(0, 10)

  if (truncated.length === 0) {
    return ''
  }
  if (truncated.length <= 3) {
    return truncated
  }
  if (truncated.length <= 6) {
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`
  }
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`
}
