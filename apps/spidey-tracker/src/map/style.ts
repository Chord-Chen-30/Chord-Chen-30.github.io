/** Custom MapLibre style — dark, red-blue Spidey-ish palette (OpenFreeMap tiles). */
export const pixelMapStyle = {
  version: 8 as const,
  name: 'web-tracker-pixel',
  sources: {
    openmaptiles: {
      type: 'vector' as const,
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#0b1020' },
    },
    {
      id: 'water',
      type: 'fill' as const,
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#152a4a' },
    },
    {
      id: 'landcover',
      type: 'fill' as const,
      source: 'openmaptiles',
      'source-layer': 'landcover',
      paint: { 'fill-color': '#12182c', 'fill-opacity': 0.6 },
    },
    {
      id: 'park',
      type: 'fill' as const,
      source: 'openmaptiles',
      'source-layer': 'park',
      paint: { 'fill-color': '#14301f', 'fill-opacity': 0.5 },
    },
    {
      id: 'building',
      type: 'fill' as const,
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 12,
      paint: { 'fill-color': '#1c2438', 'fill-opacity': 0.85 },
    },
    {
      id: 'road',
      type: 'line' as const,
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 8,
      paint: {
        'line-color': '#2a3555',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 14, 2],
      },
    },
    {
      id: 'boundary',
      type: 'line' as const,
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', ['get', 'admin_level'], 2],
      paint: {
        'line-color': '#3a1a28',
        'line-width': 1.2,
        'line-dasharray': [2, 2],
      },
    },
    {
      id: 'place-label',
      type: 'symbol' as const,
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 14],
      },
      paint: {
        'text-color': '#e8e4d8',
        'text-halo-color': '#0b1020',
        'text-halo-width': 1.2,
      },
    },
  ],
}
