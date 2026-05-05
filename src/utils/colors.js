/**
 * Calculates a highly readable contrast text color (dark or light) 
 * given a background hex color.
 * 
 * @param {string} hexcolor - The background color in hex format (e.g. '#FFFFFF' or 'FFF')
 * @returns {string} Tailwind text color class ('text-slate-900' or 'text-white')
 */
export const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return 'text-slate-200'
  
  // Remove # if present
  let cleanHex = hexcolor.replace("#", "")
  
  // If not hex (like "blue"), return default safely. We assume hex per user instructions.
  if (cleanHex.length === 6 || cleanHex.length === 3) {
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('')
    }
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    
    // YIQ formula
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    
    // If the color is very light (high YIQ), use dark text. Otherwise use white text.
    return (yiq >= 128) ? 'text-slate-900' : 'text-white'
  }
  
  return 'text-slate-200'
}
