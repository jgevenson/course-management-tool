export function disableAllMapInteractions(map) {
  map.dragging?.disable();
  map.touchZoom?.disable();
  map.doubleClickZoom?.disable();
  map.scrollWheelZoom?.disable();
  map.boxZoom?.disable();
  map.keyboard?.disable();
  if (map.tap) map.tap.disable();
  if (map.dragRotate) map.dragRotate.disable();
  if (map.touchRotate) map.touchRotate.disable();
}

export function enableAllMapInteractions(map) {
  map.dragging?.enable();
  map.touchZoom?.enable();
  map.doubleClickZoom?.enable();
  map.scrollWheelZoom?.enable();
  map.boxZoom?.enable();
  map.keyboard?.enable();
  if (map.tap) map.tap.enable();
  if (map.dragRotate) map.dragRotate.enable();
  if (map.touchRotate) map.touchRotate.enable();
}

/**
 * Strip `tabindex` attributes from Geoman's vertex / middle-marker DOM elements
 * on a given Leaflet path layer. This prevents browser-triggered `.focus()` calls
 * that, combined with a CSS-rotated map container (leaflet-rotate), cause the
 * browser to miscalculate bounding rects and force an aggressive layout shift.
 *
 * Call this right after `layer.pm.enable(...)`.
 */
export function stripGeomanMarkerTabIndex(layer) {
  if (!layer?.pm) return;
  // Geoman stores vertex markers internally; strip tabindex from their DOM
  const markers = [
    ...(layer.pm._markers || []),
    ...(layer.pm._markerGroup?.getLayers?.() || []),
  ];
  // Also handle nested arrays (polygon rings)
  function processMarker(m) {
    if (Array.isArray(m)) {
      m.forEach(processMarker);
      return;
    }
    const el = m?._icon || m?.getElement?.();
    if (el) el.removeAttribute('tabindex');
  }
  markers.forEach(processMarker);

  // Belt-and-suspenders: query the map container for any remaining tabindex'd
  // Geoman marker elements (they use class `marker-icon` inside the edit pane).
  const container = layer._map?.getContainer?.();
  if (container) {
    container
      .querySelectorAll('.leaflet-marker-icon[tabindex]')
      .forEach((el) => el.removeAttribute('tabindex'));
  }
}
