import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
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
      if (typeof maplibreGL === 'function') {
        glLayer = (maplibreGL as unknown as (opts: Record<string, unknown>) => L.Layer)({
          style: styleUrl,
          attribution: OSM_ATTRIBUTION,
          interactive: false,
        })
        glLayer.addTo(map)
        layerRef.current = glLayer
      } else {
        throw new Error('maplibreGL function unavailable')
      }
    } catch {
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
