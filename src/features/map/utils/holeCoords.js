// AI assisted development
export function coordSet(lat, lng) {
  return lat != null && lng != null && !(Number(lat) === 0 && Number(lng) === 0)
}
