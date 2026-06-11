import L from 'leaflet';

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

/**
 * Enhanced configuration for Geoman edit markers.
 * Strips tabindex, disables auto-pan, and blocks event propagation on mousedown/touchstart
 * to prevent the map container / rotation plugin from hijacking the gesture.
 */
export function setupGeomanEditMarkers(layer) {
  if (!layer?.pm) return;

  const map = layer._map;

  function setupMarker(marker) {
    if (!marker) return;

    // 1. Disable autoPan
    marker.options.autoPan = false;

    // 2. Strip tabindex
    const el = marker._icon || marker.getElement?.();
    if (el) {
      el.removeAttribute('tabindex');
    }

    // 3. Stop event propagation on mousedown/touchstart
    const stopPropagation = (e) => {
      console.log(`[setupGeomanEditMarkers] Stopping propagation for event type: ${e.type} on marker`, marker._leaflet_id);
      if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
      }
    };

    marker.off('mousedown', stopPropagation);
    marker.off('touchstart', stopPropagation);
    marker.on('mousedown', stopPropagation);
    marker.on('touchstart', stopPropagation);
  }

  // Process existing markers (initial edit handles)
  const markers = [
    ...(layer.pm._markers || []),
    ...(layer.pm._markerGroup?.getLayers?.() || []),
  ];

  function processMarker(m) {
    if (Array.isArray(m)) {
      m.forEach(processMarker);
      return;
    }
    setupMarker(m);
  }
  markers.forEach(processMarker);

  // Strip tabindexes from map container as a fallback
  const container = map?.getContainer?.();
  if (container) {
    container
      .querySelectorAll('.leaflet-marker-icon[tabindex]')
      .forEach((el) => el.removeAttribute('tabindex'));
  }

  // Listen for dynamic marker additions (e.g. midpoints dragged, new vertices added)
  if (layer.pm._markerGroup) {
    if (layer.pm._onMarkerGroupLayerAdd) {
      layer.pm._markerGroup.off('layeradd', layer.pm._onMarkerGroupLayerAdd);
    }

    layer.pm._onMarkerGroupLayerAdd = (e) => {
      if (e.layer) {
        console.log('[setupGeomanEditMarkers] Dynamic marker added:', e.layer._leaflet_id);
        setupMarker(e.layer);
      }
    };

    layer.pm._markerGroup.on('layeradd', layer.pm._onMarkerGroupLayerAdd);
  }
}

