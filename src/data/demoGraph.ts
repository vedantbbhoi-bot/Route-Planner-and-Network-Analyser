export type NetworkPreset = 'city' | 'eulerian-path' | 'eulerian-circuit'

export interface CenterPoint {
  lat: number
  lng: number
}

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  lat: number
  lng: number
  kind: 'junction' | 'landmark' | 'terminal'
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  weight: number
  distanceKm: number
}

export interface DemoGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export const DEFAULT_CENTER: CenterPoint = { lat: 40.7194, lng: -74.0028 }

const CITY_LAYOUT = [
  { id: 'n01', label: 'Civic Center', x: 0.12, y: 0.18, kind: 'landmark' },
  { id: 'n02', label: 'Market Street', x: 0.31, y: 0.18, kind: 'junction' },
  { id: 'n03', label: 'Union Square', x: 0.50, y: 0.18, kind: 'landmark' },
  { id: 'n04', label: 'North Gate', x: 0.69, y: 0.18, kind: 'terminal' },
  { id: 'n06', label: 'Ferry Plaza', x: 0.12, y: 0.42, kind: 'landmark' },
  { id: 'n07', label: 'Transit Hub', x: 0.31, y: 0.42, kind: 'terminal' },
  { id: 'n08', label: 'Museum Row', x: 0.50, y: 0.42, kind: 'landmark' },
  { id: 'n09', label: 'Central Park', x: 0.69, y: 0.42, kind: 'landmark' },
  { id: 'n11', label: 'South Market', x: 0.12, y: 0.66, kind: 'junction' },
  { id: 'n12', label: 'Civic Gardens', x: 0.31, y: 0.66, kind: 'landmark' },
  { id: 'n13', label: 'West End', x: 0.50, y: 0.66, kind: 'junction' },
  { id: 'n14', label: 'Old Harbor', x: 0.69, y: 0.66, kind: 'landmark' },
  { id: 'n15', label: 'Harbor Gate', x: 0.88, y: 0.66, kind: 'junction' },
  { id: 'n16', label: 'Airport Link', x: 0.88, y: 0.84, kind: 'terminal' },
  { id: 'n17', label: 'Warehouse District', x: 0.69, y: 0.84, kind: 'junction' },
  { id: 'n18', label: 'Library Way', x: 0.50, y: 0.84, kind: 'landmark' },
  { id: 'n19', label: 'Hilltop', x: 0.31, y: 0.84, kind: 'junction' },
  { id: 'n20', label: 'Observatory', x: 0.12, y: 0.84, kind: 'terminal' },
] as const

const CITY_PAIRS = [
  ['n01', 'n02'], ['n02', 'n03'], ['n03', 'n04'],
  ['n06', 'n07'], ['n07', 'n08'], ['n08', 'n09'],
  ['n11', 'n12'], ['n12', 'n13'], ['n13', 'n14'],
  ['n01', 'n06'], ['n06', 'n11'],
  ['n02', 'n07'], ['n07', 'n12'],
  ['n03', 'n08'], ['n08', 'n13'],
  ['n04', 'n09'], ['n09', 'n14'],
  ['n01', 'n07'], ['n02', 'n06'], ['n02', 'n08'],
  ['n03', 'n07'], ['n03', 'n09'], ['n06', 'n12'],
  ['n07', 'n11'], ['n07', 'n13'], ['n08', 'n12'],
  ['n08', 'n14'], ['n11', 'n13'], ['n12', 'n14'],
  ['n14', 'n15'], ['n15', 'n16'], ['n16', 'n17'],
  ['n17', 'n18'], ['n18', 'n19'], ['n19', 'n20'],
] as const

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: CenterPoint, b: CenterPoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const lat1 = radians(a.lat)
  const lat2 = radians(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function toGeoPoint(center: CenterPoint, x: number, y: number): CenterPoint {
  const lngSpan = 0.0105
  const latSpan = 0.0072
  return {
    lat: center.lat + (0.5 - y) * latSpan,
    lng: center.lng + (x - 0.5) * lngSpan,
  }
}

function createCircularLayout() {
  return Array.from({ length: 12 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2
    return {
      id: `c${String(index + 1).padStart(2, '0')}`,
      label: ['North Loop', 'East Arch', 'Canal Point', 'Market Gate', 'South Loop', 'Ferry Bend', 'Harbor Point', 'West Arch', 'Park Gate', 'Library Sq', 'Hillcrest', 'Civic Row'][index],
      x: 0.5 + Math.cos(angle) * 0.34,
      y: 0.5 + Math.sin(angle) * 0.31,
      kind: index % 3 === 0 ? 'landmark' as const : 'junction' as const,
    }
  })
}

function createPathLayout() {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `p${String(index + 1).padStart(2, '0')}`,
    label: ['Civic Start', 'Market Turn', 'Museum Walk', 'Canal Bend', 'Garden Gate', 'West Plaza', 'Old Wharf', 'Harbor Steps', 'Depot Lane', 'Hill Crossing', 'Library Row', 'East Terminal'][index],
    x: 0.10 + (index / 11) * 0.80,
    y: 0.50 + Math.sin(index * 0.82) * 0.20,
    kind: index === 0 || index === 11 ? 'terminal' as const : 'junction' as const,
  }))
}

export function createDemoGraph(center: CenterPoint, preset: NetworkPreset): DemoGraph {
  const layout = preset === 'eulerian-circuit'
    ? createCircularLayout()
    : preset === 'eulerian-path'
      ? createPathLayout()
      : CITY_LAYOUT

  const nodes: GraphNode[] = layout.map((item) => {
    const point = toGeoPoint(center, item.x, item.y)
    return { ...item, ...point }
  })

  const pairs = preset === 'eulerian-circuit'
    ? nodes.map((node, index) => [node.id, nodes[(index + 1) % nodes.length].id] as const)
    : preset === 'eulerian-path'
      ? nodes.slice(0, -1).map((node, index) => [node.id, nodes[index + 1].id] as const)
      : CITY_PAIRS

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const edges: GraphEdge[] = pairs.map(([from, to], index) => {
    const a = nodeById.get(from)!
    const b = nodeById.get(to)!
    const distanceKm = haversineKm(a, b)
    const trafficFactor = [1, 1.08, 1.16, 1.03][(index * 3 + 1) % 4]
    return {
      id: `${from}-${to}`,
      from,
      to,
      distanceKm,
      weight: distanceKm * trafficFactor,
    }
  })

  return { nodes, edges }
}
