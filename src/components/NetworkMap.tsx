import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Tooltip, useMap } from 'react-leaflet'
import { Crosshair, Layers3, LocateFixed, Minus, Plus } from 'lucide-react'
import type { AnalysisView } from '../App'
import type { CenterPoint, DemoGraph } from '../data/demoGraph'

interface NetworkMapProps {
  graph: DemoGraph
  center: CenterPoint
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
}

const ROUTE_COLORS = ['#2b9fff', '#38d776', '#e6dc32', '#ff4f67']

function SetView({ graph }: { graph: DemoGraph }) {
  const map = useMap()
  useEffect(() => {
    const points = graph.nodes.map((node) => [node.lat, node.lng] as [number, number])
    if (points.length) map.fitBounds(points, { paddingTopLeft: [38, 38], paddingBottomRight: [58, 38], maxZoom: 18.5, animate: true, duration: 0.7 })
  }, [graph.nodes, map])
  return null
}

function MapControlRail({
  graph,
  gridEnabled,
  onToggleGrid,
  onLocate,
}: {
  graph: DemoGraph
  gridEnabled: boolean
  onToggleGrid: () => void
  onLocate: () => void
}) {
  const map = useMap()
  const fitNetwork = () => map.fitBounds(
    graph.nodes.map((node) => [node.lat, node.lng] as [number, number]),
    { padding: [42, 42], maxZoom: 18.5 },
  )

  return (
    <div className="map-control-rail" aria-label="Map controls" onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}>
      <button aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}><Plus size={16} /></button>
      <button aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}><Minus size={16} /></button>
      <span className="map-control-divider" />
      <button aria-label="Center network" title="Center network" onClick={fitNetwork}><Crosshair size={15} /></button>
      <button aria-label="Use current location" title="Use my location" onClick={onLocate}><LocateFixed size={15} /></button>
      <span className="map-control-divider" />
      <button aria-label={gridEnabled ? 'Hide street grid' : 'Show street grid'} aria-pressed={gridEnabled} title={gridEnabled ? 'Hide street grid' : 'Show street grid'} onClick={onToggleGrid}><Layers3 size={15} /></button>
    </div>
  )
}

export default function NetworkMap({
  graph,
  center,
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
      attributionControl={false}
    >
      <SetView graph={graph} />
      <MapControlRail
        graph={graph}
        gridEnabled={gridEnabled}
        onToggleGrid={() => setGridEnabled((enabled) => !enabled)}
        onLocate={onLocate}
      />

      {graph.edges.map((edge, index) => {
        const a = nodeById.get(edge.from)
        const b = nodeById.get(edge.to)
        if (!a || !b) return null
        const highlighted = activeView === 'route' ? path.has(edge.id)
          : activeView === 'mst' ? mst.has(edge.id)
            : activeView === 'connectivity' ? bridges.has(edge.id)
              : euler.has(edge.id)
        const color = activeView === 'mst' && mst.has(edge.id) ? '#2e9bff'
          : activeView === 'connectivity' && bridges.has(edge.id) ? '#ffb34f'
            : activeView === 'eulerian' && euler.has(edge.id) ? '#a8ed59'
              : path.has(edge.id) ? '#eadf37'
                : ROUTE_COLORS[index % ROUTE_COLORS.length]
        return (
          <Polyline
            key={edge.id}
            positions={[[a.lat, a.lng], [b.lat, b.lng]]}
            pathOptions={{
              color,
              weight: highlighted ? 5 : 2.5,
              opacity: highlighted ? 0.96 : 0.64,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: activeView === 'connectivity' && bridges.has(edge.id) ? '8 7' : undefined,
            }}
            eventHandlers={{ click: () => onNodeSelect(edge.from) }}
          >
            <Tooltip sticky className="edge-tooltip">
              <strong>{a.label} ↔ {b.label}</strong><br />
              {edge.distanceKm.toFixed(2)} km · cost {edge.weight.toFixed(2)} km-eq.
            </Tooltip>
          </Polyline>
        )
      })}

      {graph.nodes.map((node) => {
        const isOrigin = node.id === originId
        const isDestination = node.id === destinationId
        const fillColor = isOrigin ? '#48df9b' : isDestination ? '#ff6577' : '#42d6ff'
        return (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={isOrigin || isDestination ? 8 : 5}
            pathOptions={{
              color: isOrigin ? '#a5ffce' : isDestination ? '#ffadb6' : '#7be7ff',
              fillColor,
              fillOpacity: 0.95,
              weight: 2,
              opacity: 0.98,
            }}
            eventHandlers={{ click: () => onNodeSelect(node.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent className="node-label-tooltip">
              <span className="node-label-code">{node.id.replace(/^\D+/, '').padStart(2, '0')}</span>
              <span>{node.label}</span>
            </Tooltip>
          </CircleMarker>
        )
      })}

      <div className={`map-select-hint ${selectionTarget ? 'is-visible' : ''}`}>
        {selectionTarget ? `Click a junction to set ${selectionTarget}` : 'Click a junction to inspect'}
      </div>
    </MapContainer>
  )
}
