import { haversineKm, type GraphEdge, type GraphNode } from '../data/demoGraph'

export type ShortestPathMethod = 'dijkstra' | 'astar' | 'bellman-ford'
export type SpanningTreeMethod = 'kruskal' | 'prim'

export interface PathResult {
  nodeIds: string[]
  edgeIds: string[]
  totalWeight: number
}

interface AdjacencyEntry {
  nodeId: string
  edge: GraphEdge
}

function makeAdjacency(nodes: GraphNode[], edges: GraphEdge[]): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map(nodes.map((node) => [node.id, [] as AdjacencyEntry[]]))
  for (const edge of edges) {
    adjacency.get(edge.from)?.push({ nodeId: edge.to, edge })
    adjacency.get(edge.to)?.push({ nodeId: edge.from, edge })
  }
  return adjacency
}

function reconstructPath(
  startId: string,
  endId: string,
  previous: Map<string, { nodeId: string; edgeId: string }>,
  totalWeight: number,
): PathResult {
  if (startId === endId) return { nodeIds: [startId], edgeIds: [], totalWeight: 0 }
  if (!previous.has(endId)) return { nodeIds: [], edgeIds: [], totalWeight: Number.POSITIVE_INFINITY }

  const nodeIds = [endId]
  const edgeIds: string[] = []
  let cursor = endId
  while (cursor !== startId) {
    const step = previous.get(cursor)
    if (!step) return { nodeIds: [], edgeIds: [], totalWeight: Number.POSITIVE_INFINITY }
    edgeIds.push(step.edgeId)
    cursor = step.nodeId
    nodeIds.push(cursor)
  }
  return { nodeIds: nodeIds.reverse(), edgeIds: edgeIds.reverse(), totalWeight }
}

function dijkstra(nodes: GraphNode[], edges: GraphEdge[], startId: string, endId: string): PathResult {
  const adjacency = makeAdjacency(nodes, edges)
  const distance = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, { nodeId: string; edgeId: string }>()
  const visited = new Set<string>()
  distance.set(startId, 0)

  while (visited.size < nodes.length) {
    let current: string | undefined
    let best = Number.POSITIVE_INFINITY
    for (const [nodeId, value] of distance) {
      if (!visited.has(nodeId) && value < best) {
        current = nodeId
        best = value
      }
    }
    if (!current || best === Number.POSITIVE_INFINITY) break
    if (current === endId) break
    visited.add(current)

    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor.nodeId)) continue
      const next = best + neighbor.edge.weight
      if (next < (distance.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY)) {
        distance.set(neighbor.nodeId, next)
        previous.set(neighbor.nodeId, { nodeId: current, edgeId: neighbor.edge.id })
      }
    }
  }
  return reconstructPath(startId, endId, previous, distance.get(endId) ?? Number.POSITIVE_INFINITY)
}

function aStar(nodes: GraphNode[], edges: GraphEdge[], startId: string, endId: string): PathResult {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const end = nodeById.get(endId)
  const adjacency = makeAdjacency(nodes, edges)
  const gScore = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  const fScore = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, { nodeId: string; edgeId: string }>()
  const open = new Set([startId])
  const heuristic = (nodeId: string) => {
    const node = nodeById.get(nodeId)
    return node && end ? haversineKm(node, end) : 0
  }
  gScore.set(startId, 0)
  fScore.set(startId, heuristic(startId))

  while (open.size) {
    let current: string | undefined
    let best = Number.POSITIVE_INFINITY
    for (const nodeId of open) {
      const score = fScore.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (score < best) {
        current = nodeId
        best = score
      }
    }
    if (!current) break
    if (current === endId) return reconstructPath(startId, endId, previous, gScore.get(endId) ?? 0)
    open.delete(current)

    for (const neighbor of adjacency.get(current) ?? []) {
      const tentative = (gScore.get(current) ?? Number.POSITIVE_INFINITY) + neighbor.edge.weight
      if (tentative < (gScore.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY)) {
        previous.set(neighbor.nodeId, { nodeId: current, edgeId: neighbor.edge.id })
        gScore.set(neighbor.nodeId, tentative)
        fScore.set(neighbor.nodeId, tentative + heuristic(neighbor.nodeId))
        open.add(neighbor.nodeId)
      }
    }
  }
  return reconstructPath(startId, endId, previous, Number.POSITIVE_INFINITY)
}

function bellmanFord(nodes: GraphNode[], edges: GraphEdge[], startId: string, endId: string): PathResult {
  const distance = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, { nodeId: string; edgeId: string }>()
  distance.set(startId, 0)

  for (let pass = 1; pass < nodes.length; pass += 1) {
    let changed = false
    for (const edge of edges) {
      for (const [from, to] of [[edge.from, edge.to], [edge.to, edge.from]]) {
        const candidate = (distance.get(from) ?? Number.POSITIVE_INFINITY) + edge.weight
        if (candidate < (distance.get(to) ?? Number.POSITIVE_INFINITY)) {
          distance.set(to, candidate)
          previous.set(to, { nodeId: from, edgeId: edge.id })
          changed = true
        }
      }
    }
    if (!changed) break
  }
  return reconstructPath(startId, endId, previous, distance.get(endId) ?? Number.POSITIVE_INFINITY)
}

export function shortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string,
  method: ShortestPathMethod,
): PathResult {
  if (method === 'astar') return aStar(nodes, edges, startId, endId)
  if (method === 'bellman-ford') return bellmanFord(nodes, edges, startId, endId)
  return dijkstra(nodes, edges, startId, endId)
}

export function connectedComponents(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const adjacency = makeAdjacency(nodes, edges)
  const visited = new Set<string>()
  const components: string[][] = []
  for (const node of nodes) {
    if (visited.has(node.id)) continue
    const component: string[] = []
    const stack = [node.id]
    visited.add(node.id)
    while (stack.length) {
      const current = stack.pop()!
      component.push(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor.nodeId)) continue
        visited.add(neighbor.nodeId)
        stack.push(neighbor.nodeId)
      }
    }
    components.push(component)
  }
  return components
}

export function findBridges(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
  const adjacency = makeAdjacency(nodes, edges)
  const discovery = new Map<string, number>()
  const low = new Map<string, number>()
  const bridges: GraphEdge[] = []
  let time = 0

  const visit = (nodeId: string, parentEdgeId?: string) => {
    time += 1
    discovery.set(nodeId, time)
    low.set(nodeId, time)
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (neighbor.edge.id === parentEdgeId) continue
      if (!discovery.has(neighbor.nodeId)) {
        visit(neighbor.nodeId, neighbor.edge.id)
        low.set(nodeId, Math.min(low.get(nodeId)!, low.get(neighbor.nodeId)!))
        if (low.get(neighbor.nodeId)! > discovery.get(nodeId)!) bridges.push(neighbor.edge)
      } else {
        low.set(nodeId, Math.min(low.get(nodeId)!, discovery.get(neighbor.nodeId)!))
      }
    }
  }

  for (const node of nodes) if (!discovery.has(node.id)) visit(node.id)
  return bridges
}

export function minimumSpanningTree(
  nodes: GraphNode[],
  edges: GraphEdge[],
  method: SpanningTreeMethod,
): GraphEdge[] {
  const selected: GraphEdge[] = []
  if (method === 'kruskal') {
    const parent = new Map(nodes.map((node) => [node.id, node.id]))
    const find = (id: string): string => {
      const root = parent.get(id) ?? id
      if (root === id) return id
      const representative = find(root)
      parent.set(id, representative)
      return representative
    }
    for (const edge of [...edges].sort((a, b) => a.weight - b.weight)) {
      const a = find(edge.from)
      const b = find(edge.to)
      if (a === b) continue
      parent.set(a, b)
      selected.push(edge)
      if (selected.length === nodes.length - 1) break
    }
    return selected
  }

  if (nodes.length === 0) return selected
  const adjacency = makeAdjacency(nodes, edges)
  const visited = new Set([nodes[0].id])
  while (visited.size < nodes.length) {
    let candidate: GraphEdge | undefined
    for (const nodeId of visited) {
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        if (visited.has(neighbor.nodeId)) continue
        if (!candidate || neighbor.edge.weight < candidate.weight) candidate = neighbor.edge
      }
    }
    if (!candidate) break
    selected.push(candidate)
    visited.add(visited.has(candidate.from) ? candidate.to : candidate.from)
  }
  return selected
}

export interface EulerianResult {
  kind: 'circuit' | 'path' | 'none'
  nodeIds: string[]
  edgeIds: string[]
  reason?: string
}

export function eulerianTrail(nodes: GraphNode[], edges: GraphEdge[]): EulerianResult {
  const adjacency = makeAdjacency(nodes, edges)
  const degree = new Map(nodes.map((node) => [node.id, adjacency.get(node.id)?.length ?? 0]))
  const active = nodes.filter((node) => (degree.get(node.id) ?? 0) > 0)
  const activeComponents = connectedComponents(active, edges.filter((edge) => degree.get(edge.from)! > 0 && degree.get(edge.to)! > 0))
  if (activeComponents.length > 1) {
    return { kind: 'none', nodeIds: [], edgeIds: [], reason: 'The non-isolated network is disconnected.' }
  }

  const oddNodes = active.filter((node) => (degree.get(node.id)! % 2) === 1)
  if (oddNodes.length !== 0 && oddNodes.length !== 2) {
    return { kind: 'none', nodeIds: [], edgeIds: [], reason: `${oddNodes.length} odd-degree junctions; an Eulerian trail needs exactly 0 or 2.` }
  }

  if (edges.length === 0) {
    return { kind: 'circuit', nodeIds: nodes.slice(0, 1).map((node) => node.id), edgeIds: [] }
  }

  const start = oddNodes[0]?.id ?? active[0]?.id
  if (!start) return { kind: 'none', nodeIds: [], edgeIds: [], reason: 'No active junctions are available.' }
  const remaining = new Map<string, GraphEdge[]>(nodes.map((node) => [node.id, [...(adjacency.get(node.id) ?? [])].map((item) => item.edge)]))
  const edgeSeen = new Set<string>()
  const stack = [start]
  const route: string[] = []
  while (stack.length) {
    const current = stack[stack.length - 1]
    const next = (remaining.get(current) ?? []).find((edge) => !edgeSeen.has(edge.id))
    if (next) {
      edgeSeen.add(next.id)
      stack.push(next.from === current ? next.to : next.from)
    } else {
      route.push(stack.pop()!)
    }
  }
  const nodeIds = route.reverse()
  const edgeIds: string[] = []
  for (let index = 0; index < nodeIds.length - 1; index += 1) {
    const edge = (adjacency.get(nodeIds[index]) ?? []).find((item) => item.nodeId === nodeIds[index + 1] && !edgeIds.includes(item.edge.id))
    if (edge) edgeIds.push(edge.edge.id)
  }
  if (edgeIds.length !== edges.length) {
    return { kind: 'none', nodeIds: [], edgeIds: [], reason: 'The graph contains an unreachable edge.' }
  }
  return { kind: oddNodes.length === 0 ? 'circuit' : 'path', nodeIds, edgeIds }
}
