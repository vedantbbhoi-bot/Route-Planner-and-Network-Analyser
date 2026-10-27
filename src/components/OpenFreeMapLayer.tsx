import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import '@maplibre/maplibre-gl-leaflet'
import { DEFAULT_OPENFREEMAP_STYLE, OSM_ATTRIBUTION, OSM_FALLBACK_URL } from '../data/mapTiles'

interface OpenFreeMapLayerProps {
  styleUrl?: string
}

export default function OpenFreeMapLayer({ styleUrl = DEFAULT_OPENFREEMAP_STYLE }: OpenFreeMapLayerProps) {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    let active = true
    let glLayer: L.Layer | null = null
    let fallbackTileLayer: L.TileLayer | null = null

    try {
      // MapLibre GL Leaflet integration for OpenFreeMap (vector tiles, no API key required)
      if (typeof (L as unknown as { maplibreGL?: (opts: unknown) => L.Layer }).maplibreGL === 'function') {
        glLayer = (L as unknown as { maplibreGL: (opts: unknown) => L.Layer }).maplibreGL({
          style: styleUrl,
          attribution: OSM_ATTRIBUTION,
          interactive: false,
        })
        glLayer.addTo(map)
        layerRef.current = glLayer
      } else {
        throw new Error('maplibreGL plugin not detected on Leaflet')
      }
    } catch {
      // Direct OpenStreetMap raster fallback (100% free, no API key)
      if (active) {
        fallbackTileLayer = L.tileLayer(OSM_FALLBACK_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        })
        fallbackTileLayer.addTo(map)
        layerRef.current = fallbackTileLayer
      }
    }

    return () => {
      active = false
      if (glLayer && map.hasLayer(glLayer)) {
        map.removeLayer(glLayer)
      }
      if (fallbackTileLayer && map.hasLayer(fallbackTileLayer)) {
        map.removeLayer(fallbackTileLayer)
      }
      layerRef.current = null
    }
  }, [map, styleUrl])

  return null
}
