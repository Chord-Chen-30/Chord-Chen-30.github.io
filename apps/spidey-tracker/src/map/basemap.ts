import type { Map, StyleSpecification } from 'maplibre-gl'

/**
 * OpenFreeMap dark vector — recolored to match spidey-ref-map.png + site chrome.
 * Ocean ~#10172a, land muted blue #1f3251–#254872, cyan labels.
 */
export const SPIDEY_BASE_STYLE = 'https://tiles.openfreemap.org/styles/dark'

/** CARTO dark raster fallback if OFM fails (same dark family). */
export const darkRasterFallback: StyleSpecification = {
  version: 8,
  name: 'carto-dark-fallback',
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'carto-base', type: 'raster', source: 'carto' }],
}

/**
 * CARTO is the primary style because it degrades more reliably on networks
 * where OpenFreeMap's vector tiles load without surfacing a MapLibre error.
 */
export const spideyMapStyle: StyleSpecification = darkRasterFallback

/**
 * Recolor OFM dark layers to official Spidey Tracker map palette.
 * Call after map `load`.
 */
export function applySpideyMapColors(map: Map) {
  const setPaint = (id: string, prop: string, value: unknown) => {
    if (!map.getLayer(id)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setPaintProperty(id, prop as any, value as any)
    } catch {
      /* layer may not support prop */
    }
  }

  // Land = muted monitor blue; water darker navy on top
  setPaint('background', 'background-color', '#1a2d48')
  setPaint('water', 'fill-color', '#10172a')
  setPaint('waterway', 'line-color', '#0c1322')

  // Soften landcover so continents stay readable blues (not green parks)
  for (const id of [
    'landcover_ice_shelf',
    'landcover_glacier',
    'landcover_wood',
    'landuse_residential',
    'landuse_park',
  ]) {
    setPaint(id, 'fill-color', '#243a58')
    setPaint(id, 'fill-opacity', 0.35)
  }

  // Ocean / sea names — cyan on dark water
  setPaint('water_name', 'text-color', '#9ec2d4')
  setPaint('water_name', 'text-halo-color', '#10172a')
  setPaint('water_name', 'text-halo-width', 1.5)
  setPaint('water_name', 'text-opacity', 0.9)

  const layers = map.getStyle().layers ?? []
  for (const { id } of layers) {
    if (id.startsWith('place_')) {
      setPaint(id, 'text-color', '#c5e8f6')
      setPaint(id, 'text-halo-color', '#10172a')
      setPaint(id, 'text-halo-width', 1.25)
    }
    if (id.startsWith('boundary')) {
      setPaint(id, 'line-color', '#366590')
      setPaint(id, 'line-opacity', 0.75)
    }
    if (id.startsWith('road') || id.startsWith('highway') || id.includes('transport')) {
      setPaint(id, 'line-color', '#2a4568')
      setPaint(id, 'line-opacity', 0.5)
    }
  }
}
