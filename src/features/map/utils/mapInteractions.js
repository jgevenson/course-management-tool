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
