import { useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Pane, Polyline, Tooltip, useMap } from 'react-leaflet'
import { Crosshair, Layers3, LocateFixed, Minus, Navigation, Plus } from 'lucide-react'
import type { AnalysisView } from '../App'
import type { CenterPoint, DemoGraph } from '../data/demoGraph'
import OpenFreeMapLayer from './OpenFreeMapLayer'

interface UserLocationState extends CenterPoint {
  accuracyMeters: number
  heading?: number | null
  speed?: number | null
}

interface NetworkMapProps {
  graph: DemoGraph
  center: CenterPoint
  userLocation: UserLocationState | null
  isTracking: boolean
  activeView: AnalysisView
  originId: string
  destinationId: string
  pathEdgeIds: string[]
  mstEdgeIds: string[]
  bridgeEdgeIds: string[]
  eulerEdgeIds: string[]
  selectionTarget: 'origin' | 'destination' | null
  onNodeSelect: (nodeId: string) => void
  onLocate: () => void
  onToggleTracking: () => void
}

const ROUTE_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f43f5e']

function SetView({ graph, userLocation, isTracking }: { graph: DemoGraph; userLocation: UserLocationState | null; isTracking: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (isTracking && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.8 })
      return
    }

    const points = graph.nodes.map((node) => [node.lat, node.lng] as [number, number])
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng])
    }
    if (points.length) {
      map.fitBounds(points, {
        paddingTopLeft: [48, 48],
        paddingBottomRight: [64, 48],
        maxZoom: 18,
        animate: true,
        duration: 0.8,
      })
    }
  }, [graph.nodes, isTracking, map])

  return null
}

function MapControlRail({
  graph,
  userLocation,
  gridEnabled,
  isTracking,
  onToggleGrid,
  onLocate,
  onToggleTracking,
}: {
  graph: DemoGraph
  userLocation: UserLocationState | null
  gridEnabled: boolean
  isTracking: boolean
  onToggleGrid: () => void
  onLocate: () => void
  onToggleTracking: () => void
}) {
  const map = useMap()
  const fitNetwork = () => {
    const pts = graph.nodes.map((node) => [node.lat, node.lng] as [number, number])
    if (userLocation) pts.push([userLocation.lat, userLocation.lng])
    map.fitBounds(pts, { padding: [48, 48], maxZoom: 18 })
  }

  return (
    <div className="map-control-rail" aria-label="Map controls" onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}>
      <button aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}><Plus size={16} /></button>
      <button aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}><Minus size={16} /></button>
      <span className="map-control-divider" />
      <button aria-label="Fit network view" title="Fit network view" onClick={fitNetwork}><Crosshair size={15} /></button>
      <button
        aria-label="Find my real GPS location"
        className={userLocation ? 'active-location' : ''}
        title="Find my real GPS location"
        onClick={onLocate}
      >
        <LocateFixed size={15} />
      </button>
      <button
        aria-label={isTracking ? 'Live tracking active' : 'Turn on live GPS tracking'}
        aria-pressed={isTracking}
        className={isTracking ? 'is-tracking-btn pulse' : ''}
        title={isTracking ? 'Live tracking active (click to pause)' : 'Follow my real-time movement'}
        onClick={onToggleTracking}
      >
        <Navigation size={14} className={isTracking ? 'text-cyan-400 rotate-animation' : ''} />
      </button>
      <span className="map-control-divider" />
      <button
        aria-label={gridEnabled ? 'Hide tactical radar overlay' : 'Show tactical radar overlay'}
        aria-pressed={gridEnabled}
        title={gridEnabled ? 'Toggle radar overlay' : 'Toggle radar overlay'}
        onClick={onToggleGrid}
      >
        <Layers3 size={15} />
      </button>
    </div>
  )
}

export default function NetworkMap({
  graph,
  center,
  userLocation,
  isTracking,
  activeView,
  originId,
  destinationId,
  pathEdgeIds,
  mstEdgeIds,
  bridgeEdgeIds,
  eulerEdgeIds,
  selectionTarget,
  onNodeSelect,
  onLocate,
  onToggleTracking,
}: NetworkMapProps) {
  const [gridEnabled, setGridEnabled] = useState(true)
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const path = new Set(pathEdgeIds)
  const mst = new Set(mstEdgeIds)
  const bridges = new Set(bridgeEdgeIds)
  const euler = new Set(eulerEdgeIds)

  return (
    <MapContainer
      className={`network-map ${gridEnabled ? 'grid-visible' : 'grid-hidden'}`}
      center={[center.lat, center.lng]}
      zoom={16}
      zoomControl={false}
      scrollWheelZoom
      doubleClickZoom
      attributionControl
    >
      <SetView graph={graph} userLocation={userLocation} isTracking={isTracking} />
      
      {/* Real Map Tiles (OpenFreeMap: 100% Free, No API Key, No Tracking) */}
      <OpenFreeMapLayer />

      <Pane name="street-grid-overlay" style={{ zIndex: 350, pointerEvents: 'none' }}>
        <div className={`map-grid-overlay ${gridEnabled ? 'is-visible' : 'is-hidden'}`} />
      </Pane>

      <MapControlRail
        graph={graph}
        userLocation={userLocation}
        gridEnabled={gridEnabled}
        isTracking={isTracking}
        onToggleGrid={() => setGridEnabled((enabled) => !enabled)}
        onLocate={onLocate}
        onToggleTracking={onToggleTracking}
      />

      {/* Network Edges */}
      {graph.edges.map((edge, index) => {
        const a = nodeById.get(edge.from)
        const b = nodeById.get(edge.to)
        if (!a || !b) return null

        const highlighted = activeView === 'route' ? path.has(edge.id)
          : activeView === 'mst' ? mst.has(edge.id)
            : activeView === 'connectivity' ? bridges.has(edge.id)
              : euler.has(edge.id)

        const color = activeView === 'mst' && mst.has(edge.id) ? '#38bdf8'
          : activeView === 'connectivity' && bridges.has(edge.id) ? '#fb923c'
            : activeView === 'eulerian' && euler.has(edge.id) ? '#a3e635'
              : path.has(edge.id) ? '#fde047'
                : ROUTE_COLORS[index % ROUTE_COLORS.length]

        return (
          <Polyline
            key={edge.id}
            positions={[[a.lat, a.lng], [b.lat, b.lng]]}
            pathOptions={{
              color,
              weight: highlighted ? 5.5 : 2.5,
              opacity: highlighted ? 0.98 : 0.45,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: activeView === 'connectivity' && bridges.has(edge.id) ? '8 8' : undefined,
            }}
            eventHandlers={{ click: () => onNodeSelect(edge.from) }}
          >
            <Tooltip sticky className="edge-tooltip">
              <strong>{a.label} ↔ {b.label}</strong><br />
              {edge.distanceKm.toFixed(2)} km · weight {edge.weight.toFixed(2)}
            </Tooltip>
          </Polyline>
        )
      })}

      {/* Network Junctions */}
      {graph.nodes.map((node) => {
        const isOrigin = node.id === originId
        const isDestination = node.id === destinationId
        const fillColor = isOrigin ? '#10b981' : isDestination ? '#f43f5e' : '#38bdf8'

        return (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={isOrigin || isDestination ? 9 : 5.5}
            pathOptions={{
              color: isOrigin ? '#6ee7b7' : isDestination ? '#fda4af' : '#93c5fd',
              fillColor,
              fillOpacity: 0.95,
              weight: isOrigin || isDestination ? 3 : 1.5,
              opacity: 0.98,
            }}
            eventHandlers={{ click: () => onNodeSelect(node.id) }}
          >
            <Tooltip direction="top" offset={[0, -7]} permanent className="node-label-tooltip">
              <span className="node-label-code">{node.id.replace(/^\D+/, '').padStart(2, '0')}</span>
              <span>{node.label}</span>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* Real-time GPS Location Marker */}
      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={Math.max(userLocation.accuracyMeters, 15)}
            pathOptions={{
              color: '#38bdf8',
              weight: 1.5,
              fillColor: '#0284c7',
              fillOpacity: 0.18,
              opacity: 0.65,
              dashArray: '4 4',
            }}
            interactive={false}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              fillColor: '#0ea5e9',
              fillOpacity: 1,
            }}
            interactive={false}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent className="user-location-tooltip">
              <div className="gps-live-tag">
                <span className="gps-live-pulse" />
                <span>VEDANT BHOI · LIVE GPS (±{Math.round(userLocation.accuracyMeters)}m)</span>
              </div>
            </Tooltip>
          </CircleMarker>
        </>
      )}

      <div className={`map-select-hint ${selectionTarget ? 'is-visible' : ''}`}>
        {selectionTarget ? `Click a junction to set ${selectionTarget}` : 'Click a junction to inspect'}
      </div>
    </MapContainer>
  )
}
