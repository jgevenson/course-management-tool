import { vi, describe, it, expect, beforeEach } from 'vitest';
import L from 'leaflet';
import {
  disableAllMapInteractions,
  enableAllMapInteractions,
  stripGeomanMarkerTabIndex,
  setupGeomanEditMarkers,
} from '../mapInteractions';

vi.mock('leaflet', () => {
  const mockDomEvent = {
    stopPropagation: vi.fn(),
  };
  return {
    default: {
      DomEvent: mockDomEvent,
    },
  };
});

describe('mapInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('disableAllMapInteractions', () => {
    it('disables map interaction handlers', () => {
      const mockMap = {
        dragging: { disable: vi.fn() },
        touchZoom: { disable: vi.fn() },
        doubleClickZoom: { disable: vi.fn() },
        scrollWheelZoom: { disable: vi.fn() },
        boxZoom: { disable: vi.fn() },
        keyboard: { disable: vi.fn() },
        tap: { disable: vi.fn() },
        dragRotate: { disable: vi.fn() },
        touchRotate: { disable: vi.fn() },
      };

      disableAllMapInteractions(mockMap);

      expect(mockMap.dragging.disable).toHaveBeenCalled();
      expect(mockMap.touchZoom.disable).toHaveBeenCalled();
      expect(mockMap.doubleClickZoom.disable).toHaveBeenCalled();
      expect(mockMap.scrollWheelZoom.disable).toHaveBeenCalled();
      expect(mockMap.boxZoom.disable).toHaveBeenCalled();
      expect(mockMap.keyboard.disable).toHaveBeenCalled();
      expect(mockMap.tap.disable).toHaveBeenCalled();
      expect(mockMap.dragRotate.disable).toHaveBeenCalled();
      expect(mockMap.touchRotate.disable).toHaveBeenCalled();
    });
  });

  describe('enableAllMapInteractions', () => {
    it('enables map interaction handlers', () => {
      const mockMap = {
        dragging: { enable: vi.fn() },
        touchZoom: { enable: vi.fn() },
        doubleClickZoom: { enable: vi.fn() },
        scrollWheelZoom: { enable: vi.fn() },
        boxZoom: { enable: vi.fn() },
        keyboard: { enable: vi.fn() },
        tap: { enable: vi.fn() },
        dragRotate: { enable: vi.fn() },
        touchRotate: { enable: vi.fn() },
      };

      enableAllMapInteractions(mockMap);

      expect(mockMap.dragging.enable).toHaveBeenCalled();
      expect(mockMap.touchZoom.enable).toHaveBeenCalled();
      expect(mockMap.doubleClickZoom.enable).toHaveBeenCalled();
      expect(mockMap.scrollWheelZoom.enable).toHaveBeenCalled();
      expect(mockMap.boxZoom.enable).toHaveBeenCalled();
      expect(mockMap.keyboard.enable).toHaveBeenCalled();
      expect(mockMap.tap.enable).toHaveBeenCalled();
      expect(mockMap.dragRotate.enable).toHaveBeenCalled();
      expect(mockMap.touchRotate.enable).toHaveBeenCalled();
    });
  });

  describe('stripGeomanMarkerTabIndex', () => {
    it('removes tabindex attribute from layers and map container elements', () => {
      const mockElement = { removeAttribute: vi.fn() };
      const mockMarker = {
        _icon: mockElement,
      };

      const mockContainer = {
        querySelectorAll: vi.fn().mockReturnValue([mockElement]),
      };

      const mockLayer = {
        pm: {
          _markers: [mockMarker],
          _markerGroup: {
            getLayers: vi.fn().mockReturnValue([]),
          },
        },
        _map: {
          getContainer: vi.fn().mockReturnValue(mockContainer),
        },
      };

      stripGeomanMarkerTabIndex(mockLayer);

      expect(mockElement.removeAttribute).toHaveBeenCalledWith('tabindex');
      expect(mockContainer.querySelectorAll).toHaveBeenCalledWith('.leaflet-marker-icon[tabindex]');
    });
  });

  describe('setupGeomanEditMarkers', () => {
    it('configures marker autoPan, removes tabindex, and stops propagation of mousedown/touchstart', () => {
      const mockElement = { removeAttribute: vi.fn() };
      const mockMarker = {
        _leaflet_id: 123,
        options: { autoPan: true },
        _icon: mockElement,
        on: vi.fn(),
        off: vi.fn(),
      };

      const mockMarkerGroup = {
        getLayers: vi.fn().mockReturnValue([mockMarker]),
        on: vi.fn(),
        off: vi.fn(),
      };

      const mockContainer = {
        querySelectorAll: vi.fn().mockReturnValue([]),
      };

      const mockLayer = {
        pm: {
          _markers: [],
          _markerGroup: mockMarkerGroup,
        },
        _map: {
          getContainer: vi.fn().mockReturnValue(mockContainer),
        },
      };

      setupGeomanEditMarkers(mockLayer);

      // Verify autoPan is disabled
      expect(mockMarker.options.autoPan).toBe(false);

      // Verify tabindex is stripped
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('tabindex');

      // Verify event listeners are attached
      expect(mockMarker.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockMarker.on).toHaveBeenCalledWith('touchstart', expect.any(Function));

      // Simulate mousedown and verify stopPropagation is called
      const mousedownHandler = mockMarker.on.mock.calls.find(c => c[0] === 'mousedown')[1];
      const mockEvent = {
        type: 'mousedown',
        originalEvent: { stopPropagation: vi.fn() },
      };
      mousedownHandler(mockEvent);
      expect(L.DomEvent.stopPropagation).toHaveBeenCalledWith(mockEvent.originalEvent);
    });

    it('attaches listener to markerGroup for dynamic markers', () => {
      const mockMarkerGroup = {
        getLayers: vi.fn().mockReturnValue([]),
        on: vi.fn(),
        off: vi.fn(),
      };

      const mockLayer = {
        pm: {
          _markers: [],
          _markerGroup: mockMarkerGroup,
        },
      };

      setupGeomanEditMarkers(mockLayer);

      expect(mockMarkerGroup.on).toHaveBeenCalledWith('layeradd', expect.any(Function));

      // Verify a newly added layer gets set up
      const layerAddHandler = mockMarkerGroup.on.mock.calls.find(c => c[0] === 'layeradd')[1];
      const mockElement = { removeAttribute: vi.fn() };
      const mockNewMarker = {
        _leaflet_id: 456,
        options: { autoPan: true },
        _icon: mockElement,
        on: vi.fn(),
        off: vi.fn(),
      };

      layerAddHandler({ layer: mockNewMarker });
      expect(mockNewMarker.options.autoPan).toBe(false);
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('tabindex');
      expect(mockNewMarker.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });
});
