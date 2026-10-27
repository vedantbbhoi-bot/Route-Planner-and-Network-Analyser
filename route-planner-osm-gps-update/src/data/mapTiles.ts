const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

export const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL?.trim() || OSM_TILE_URL
export const MAP_TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() || OSM_TILE_ATTRIBUTION
