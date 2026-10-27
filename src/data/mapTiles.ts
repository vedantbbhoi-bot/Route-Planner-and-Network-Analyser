// OpenFreeMap: Completely free, no registration, no API keys, and no rate limits
// Website: https://openfreemap.org

export const OPENFREEMAP_STYLES = {
  bright: 'https://tiles.openfreemap.org/styles/bright',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  positron: 'https://tiles.openfreemap.org/styles/positron',
} as const

// Standard OSM raster tile layer fallback (100% free, no API key needed)
export const OSM_FALLBACK_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>'

export const DEFAULT_OPENFREEMAP_STYLE = OPENFREEMAP_STYLES.liberty
