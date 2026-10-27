import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  Crosshair,
  GitFork,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Network,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Trees,
  UserRound,
  Waypoints,
  X,
  Zap,
} from 'lucide-react'
import NetworkMap from './components/NetworkMap'
import {
  connectedComponents,
  eulerianTrail,
  findBridges,
  minimumSpanningTree,
  shortestPath,
  type ShortestPathMethod,
  type SpanningTreeMethod,
} from './algorithms/graphAlgorithms'
import {
  createDemoGraph,
  haversineKm,
  DEFAULT_CENTER,
  type CenterPoint,
  type NetworkPreset,
} from './data/demoGraph'

export type AnalysisView = 'route' | 'connectivity' | 'mst' | 'eulerian'

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error'

const DEMO_EMAIL = 'demo@routely.app'
const DEMO_PASSWORD = 'route-demo-2026'
const SESSION_KEY = 'routely-demo-session'

const VIEW_TABS: { id: AnalysisView; label: string; icon: typeof Route }[] = [
  { id: 'route', label: 'Route planner', icon: Route },
  { id: 'connectivity', label: 'Connectivity', icon: Network },
  { id: 'mst', label: 'Spanning tree', icon: Trees },
  { id: 'eulerian', label: 'Eulerian', icon: GitFork },
]

const ALGORITHM_OPTIONS: { id: ShortestPathMethod; label: string; hint: string }[] = [
  { id: 'dijkstra', label: 'Dijkstra', hint: 'Guaranteed shortest path for non-negative costs.' },
  { id: 'astar', label: 'A* search', hint: 'Uses a straight-line distance heuristic to guide search.' },
  { id: 'bellman-ford', label: 'Bellman–Ford', hint: 'Relaxes every edge; also supports negative weights.' },
]

const PRESET_OPTIONS: { id: NetworkPreset; label: string }[] = [
  { id: 'city', label: 'Downtown grid' },
  { id: 'eulerian-path', label: 'Eulerian path demo' },
  { id: 'eulerian-circuit', label: 'Eulerian circuit demo' },
]

function formatWeight(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(2)} km-eq.` : '—'
}

function readDemoSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY) !== 'signed-out'
  } catch {
    return true
  }
}

function App() {
  const [activeView, setActiveView] = useState<AnalysisView>('route')
  const [algorithm, setAlgorithm] = useState<ShortestPathMethod>('dijkstra')
  const [mstMethod, setMstMethod] = useState<SpanningTreeMethod>('kruskal')
  const [preset, setPreset] = useState<NetworkPreset>('city')
  const [center, setCenter] = useState<CenterPoint>(DEFAULT_CENTER)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [originId, setOriginId] = useState('n01')
  const [destinationId, setDestinationId] = useState('n20')
  const [selectionTarget, setSelectionTarget] = useState<'origin' | 'destination' | null>(null)
  const [demoSignedIn, setDemoSignedIn] = useState(readDemoSession)
  const [accountOpen, setAccountOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [originText, setOriginText] = useState('Civic Center')
  const [destinationText, setDestinationText] = useState('Observatory')
  const [toast, setToast] = useState('')
  const [lastRun, setLastRun] = useState('Just now')

  const graph = useMemo(() => createDemoGraph(center, preset), [center, preset])
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes])
  const path = useMemo(
    () => shortestPath(graph.nodes, graph.edges, originId, destinationId, algorithm),
    [graph, originId, destinationId, algorithm],
  )
  const components = useMemo(() => connectedComponents(graph.nodes, graph.edges), [graph])
  const bridges = useMemo(() => findBridges(graph.nodes, graph.edges), [graph])
  const mst = useMemo(() => minimumSpanningTree(graph.nodes, graph.edges, mstMethod), [graph, mstMethod])
  const eulerian = useMemo(() => eulerianTrail(graph.nodes, graph.edges), [graph])

  useEffect(() => {
    const origin = nodeById.get(originId)
    const destination = nodeById.get(destinationId)
    if (origin && originText !== 'Current location') setOriginText(origin.label)
    if (destination) setDestinationText(destination.label)
  }, [nodeById, originId, destinationId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!graph.nodes.some((node) => node.id === originId)) setOriginId(graph.nodes[0]?.id ?? '')
    if (!graph.nodes.some((node) => node.id === destinationId)) setDestinationId(graph.nodes.at(-1)?.id ?? '')
  }, [graph, originId, destinationId])

  const activeAlgorithm = ALGORITHM_OPTIONS.find((item) => item.id === algorithm)!
  const origin = nodeById.get(originId)
  const destination = nodeById.get(destinationId)
  const selectedPathNodes = path.nodeIds.map((id) => nodeById.get(id)).filter((node) => node !== undefined)
  const mstWeight = mst.reduce((sum, edge) => sum + edge.weight, 0)
  const reachableNodes = Math.max(0, ...components.map((component) => component.length))
  const networkHealth = graph.nodes.length ? Math.round((reachableNodes / graph.nodes.length) * 100) : 0
  const eulerianLabel = eulerian.kind === 'circuit' ? 'Circuit found' : eulerian.kind === 'path' ? 'Open trail found' : 'No Eulerian trail'

  const notify = (message: string) => setToast(message)

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      notify('Location is not supported in this browser.')
      return
    }
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = { lat: position.coords.latitude, lng: position.coords.longitude }
        const recenteredGraph = createDemoGraph(nextCenter, preset)
        let nearestNode: (typeof recenteredGraph.nodes)[number] | undefined
        let nearestDistance = Number.POSITIVE_INFINITY
        for (const node of recenteredGraph.nodes) {
          const distance = haversineKm(nextCenter, node)
          if (distance < nearestDistance) {
            nearestNode = node
            nearestDistance = distance
          }
        }
        setCenter(nextCenter)
        setGeoStatus('granted')
        if (nearestNode) {
          setOriginId(nearestNode.id)
          setOriginText('Current location')
        }
        notify(nearestNode ? `Location centered. Origin snapped to nearest demo junction: ${nearestNode.label}. Coordinates stay in this browser.` : 'Location centered for this session. Coordinates stay in this browser and are not sent to a server.')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setGeoStatus('denied')
        else setGeoStatus('error')
        notify(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. Choose a mapped origin instead.' : 'Could not read your location. Try again or choose a mapped origin.')
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    )
  }

  const selectNodeFromMap = (nodeId: string) => {
    if (selectionTarget === 'origin') {
      setOriginId(nodeId)
      setOriginText(nodeById.get(nodeId)?.label ?? 'Selected junction')
      setSelectionTarget(null)
      notify('Origin updated from the map.')
      return
    }
    if (selectionTarget === 'destination') {
      setDestinationId(nodeId)
      setDestinationText(nodeById.get(nodeId)?.label ?? 'Selected junction')
      setSelectionTarget(null)
      notify('Destination updated from the map.')
      return
    }
    const node = nodeById.get(nodeId)
    if (node) notify(`${node.label} · ${graph.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId).length} connected links`)
  }

  const runRoute = () => {
    setActiveView('route')
    setLastRun('Just now')
    notify(`${activeAlgorithm.label} route recalculated.`)
  }

  const signInDemo = () => {
    setDemoSignedIn(true)
    setShowLogin(false)
    try { window.localStorage.setItem(SESSION_KEY, 'active') } catch { /* demo remains active in memory */ }
    notify('Demo session started on this device.')
  }

  const signOutDemo = () => {
    setDemoSignedIn(false)
    setAccountOpen(false)
    setShowLogin(true)
    try { window.localStorage.setItem(SESSION_KEY, 'signed-out') } catch { /* no persistent session available */ }
  }

  const onPresetChange = (nextPreset: NetworkPreset) => {
    setPreset(nextPreset)
    const nextNodes = createDemoGraph(center, nextPreset).nodes
    setOriginId(nextNodes[0]?.id ?? '')
    setDestinationId(nextNodes.at(-1)?.id ?? '')
    setOriginText(nextNodes[0]?.label ?? '')
    setDestinationText(nextNodes.at(-1)?.label ?? '')
    setActiveView(nextPreset === 'city' ? 'route' : 'eulerian')
  }

  const pathPercentage = graph.edges.length ? Math.min(100, (path.edgeIds.length / graph.edges.length) * 100 * 2.8) : 0
  const statusLine = geoStatus === 'requesting' ? 'Waiting for location permission…'
    : geoStatus === 'granted' ? 'GPS active · local demo map only'
      : geoStatus === 'denied' ? 'Location permission denied · choose an origin'
        : 'Map click: inspect junction · select a point from the form'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Waypoints size={19} strokeWidth={2.2} /></div>
          <div className="brand-copy">
            <span className="brand-name">ROUTE<span>LAB</span></span>
            <span className="brand-subtitle">NETWORK ANALYZER</span>
          </div>
        </div>
        <div className="topbar-center">
          <div className="live-indicator"><span /> LOCAL GRAPH ACTIVE</div>
          <div className="topbar-divider" />
          <div className="workspace-name"><span className="workspace-dot" /> Downtown network <ChevronDown size={13} /></div>
        </div>
        <div className="topbar-actions">
          <div className="demo-pill"><ShieldCheck size={13} /> DEMO MODE</div>
          <button className="help-button" title="About this demo" onClick={() => notify('Frontend-only demo. GPS is used only to recenter this local map; coordinates are not sent to a server.') }><CircleHelp size={17} /></button>
          <div className="account-wrap">
            <button className="account-button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
              <span className="account-avatar">{demoSignedIn ? 'AM' : 'D'}</span>
              <span className="account-name">{demoSignedIn ? 'Alex Morgan' : 'Demo account'}</span>
              <ChevronDown size={13} />
            </button>
            {accountOpen && (
              <div className="account-menu">
                <div className="account-menu-heading"><span className="account-avatar large">AM</span><div><strong>Alex Morgan</strong><small>Demo network analyst</small></div></div>
                <div className="account-menu-info"><span>DEMO EMAIL</span><strong>{DEMO_EMAIL}</strong></div>
                <div className="account-menu-note">The demo sign-in flag is stored locally. Graph data is bundled in this frontend.</div>
                <button className="account-menu-action" onClick={demoSignedIn ? signOutDemo : () => { setShowLogin(true); setAccountOpen(false) }}>
                  {demoSignedIn ? <><LogOut size={15} /> Sign out</> : <><UserRound size={15} /> Continue with demo account</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Analysis views">
        <div className="mobile-menu-button"><button onClick={() => setMobilePanelOpen((open) => !open)} aria-label="Toggle route panel"><Menu size={18} /></button></div>
        {VIEW_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`view-tab ${activeView === id ? 'active' : ''}`} onClick={() => setActiveView(id)}>
            <Icon size={15} /> <span>{label}</span>
            {id === 'route' && <span className="tab-shortcut">⌘ 1</span>}
          </button>
        ))}
        <div className="view-tabs-spacer" />
        <label className="preset-select-wrap" aria-label="Choose graph demo">
          <span>GRAPH</span>
          <select value={preset} onChange={(event) => onPresetChange(event.target.value as NetworkPreset)}>
            {PRESET_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <ChevronDown size={12} />
        </label>
        <div className="map-legend"><span className="legend-line route" /> Shortest path <span className="legend-line network" /> Network edge</div>
      </nav>

      <main className="workspace">
        <aside className={`left-panel ${mobilePanelOpen ? 'panel-open' : ''}`}>
          <div className="panel-kicker"><span className="kicker-dot" /> ROUTE WORKSPACE <span className="panel-step">01 / 04</span></div>
          <div className="panel-title-row"><div><h1>Plan a route</h1><p>Choose two junctions to explore the network.</p></div><button className="icon-only subtle" aria-label="More route options" onClick={() => notify('Route preferences are local to this demo.')}><Activity size={16} /></button></div>

          <section className="route-form-card" aria-label="Route endpoints">
            <div className="route-form-head"><span>ROUTE ENDPOINTS</span><span className="form-status"><span /> READY</span></div>
            <div className="endpoint-row origin-row">
              <div className="endpoint-rail"><span className="endpoint-dot origin-dot" /><span className="endpoint-line" /></div>
              <label className="endpoint-field">
                <span>ORIGIN</span>
                <select value={originId} onChange={(event) => { setOriginId(event.target.value); setOriginText(nodeById.get(event.target.value)?.label ?? '') }}>
                  {graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.id === originId && originText === 'Current location' ? `Current location · ${node.label}` : node.label}</option>)}
                </select>
              </label>
              <button className={`location-button ${geoStatus === 'requesting' ? 'loading' : ''}`} title="Ask browser for your current location" onClick={requestLocation} disabled={geoStatus === 'requesting'}>
                <LocateFixed size={15} /> <span>{geoStatus === 'requesting' ? 'Locating' : 'Use my location'}</span>
              </button>
            </div>
            <div className="endpoint-row destination-row">
              <div className="endpoint-rail"><span className="endpoint-dot destination-dot" /></div>
              <label className="endpoint-field">
                <span>DESTINATION</span>
                <select value={destinationId} onChange={(event) => { setDestinationId(event.target.value); setDestinationText(nodeById.get(event.target.value)?.label ?? '') }}>
                  {graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
                </select>
              </label>
              <button className="endpoint-pick-button" title="Choose a destination on the map" onClick={() => setSelectionTarget('destination')}><MapPin size={15} /></button>
            </div>
            {(geoStatus === 'denied' || geoStatus === 'unsupported' || geoStatus === 'error') && <div className="geo-message"><Crosshair size={13} /> {geoStatus === 'denied' ? 'Permission denied — choose a mapped origin.' : geoStatus === 'unsupported' ? 'Geolocation is unavailable in this browser.' : 'Could not read location. Try again.'}</div>}
            <button className="swap-button" aria-label="Swap origin and destination" onClick={() => { setOriginId(destinationId); setDestinationId(originId); setOriginText(destinationText); setDestinationText(originText) }}><ArrowDownUp size={14} /></button>
          </section>

          <section className="algorithm-section">
            <div className="section-heading"><span>ROUTE ALGORITHM</span><button title="Algorithm details" onClick={() => notify(activeAlgorithm.hint)}><CircleHelp size={14} /></button></div>
            <div className="algorithm-grid">
              {ALGORITHM_OPTIONS.map((option) => (
                <button key={option.id} className={`algorithm-choice ${algorithm === option.id ? 'selected' : ''}`} onClick={() => setAlgorithm(option.id)}>
                  <span className="algorithm-check">{algorithm === option.id ? <Check size={11} /> : null}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="algorithm-hint"><Zap size={13} /><span>{activeAlgorithm.hint}</span></div>
          </section>

          <button className="calculate-button" onClick={runRoute}><Route size={16} /> Calculate route <ArrowRight size={16} /></button>

          <section className="route-result-card">
            <div className="result-topline"><span><span className="result-pulse" /> BEST ROUTE</span><span className="result-time"><Clock3 size={12} /> {lastRun}</span></div>
            {path.nodeIds.length ? (
              <>
                <div className="result-metrics"><div><strong>{formatWeight(path.totalWeight)}</strong><span>TOTAL WEIGHT</span></div><div><strong>{path.edgeIds.length} <small>links</small></strong><span>ROUTE LENGTH</span></div></div>
                <div className="result-progress"><div style={{ width: `${Math.max(pathPercentage, 12)}%` }} /></div>
                <div className="path-preview"><div className="path-endpoint"><span className="mini-origin" /><span>{origin?.label ?? originText}</span></div><div className="path-preview-line"><span>{path.nodeIds.length} junctions</span><i /></div><div className="path-endpoint"><span className="mini-destination" /><span>{destination?.label ?? destinationText}</span></div></div>
                <div className="result-footnote"><Sparkles size={12} /> Optimal path by {activeAlgorithm.label}</div>
              </>
            ) : <div className="empty-result">No route connects those points in this network.</div>}
          </section>

          <section className="panel-footer-note"><ShieldCheck size={14} /><span>Demo network only. The overlay is illustrative and not verified road geometry.</span></section>
        </aside>

        <section className="map-stage" aria-label="Interactive graph map">
          <div className="map-stage-toolbar">
            <div className="map-title"><span className="map-title-icon"><Compass size={16} /></span><div><strong>Downtown network</strong><small>Local graph · {graph.nodes.length} junctions · {graph.edges.length} links</small></div></div>
            <div className="map-stage-actions"><button className="map-action-button" onClick={() => setSelectionTarget('origin')}><span className="action-dot start" /> Set origin</button><button className="map-action-button" onClick={() => setSelectionTarget('destination')}><span className="action-dot end" /> Set destination</button><button className="map-action-more" aria-label="Map options" onClick={() => notify('Map layers are illustrative demo data.')}><Search size={15} /></button></div>
          </div>
          <div className="map-viewport">
            <NetworkMap
              graph={graph}
              center={center}
              activeView={activeView}
              originId={originId}
              destinationId={destinationId}
              pathEdgeIds={path.edgeIds}
              mstEdgeIds={mst.map((edge) => edge.id)}
              bridgeEdgeIds={bridges.map((edge) => edge.id)}
              eulerEdgeIds={eulerian.edgeIds}
              selectionTarget={selectionTarget}
              onNodeSelect={selectNodeFromMap}
              onLocate={requestLocation}
            />
            <div className="map-badge"><span className="map-badge-dot" /> LIVE GRAPH VIEW</div>
            <div className="map-coordinates"><span>LAT {center.lat.toFixed(4)}</span><i /> <span>LNG {center.lng.toFixed(4)}</span></div>
            <div className="map-center-label"><span className="center-ring" /><span>DEMO NETWORK CENTER</span></div>
          </div>
          <div className="map-statusbar"><div className="map-status-message"><span className={geoStatus === 'granted' ? 'status-dot green' : 'status-dot'} /> {statusLine}</div><div className="map-status-right"><span><i className="signal-bars"><b /><b /><b /></i> GRAPH ONLINE</span><span>LOCAL DATASET</span></div></div>
        </section>

        <aside className="right-panel">
          <div className="right-panel-head"><div><span className="panel-kicker">NETWORK SNAPSHOT</span><h2>Analysis</h2></div><button className="icon-only subtle" aria-label="Analysis information" onClick={() => notify('All values are calculated in your browser from the selected demo graph.')}><CircleHelp size={15} /></button></div>
          <div className="health-card">
            <div className="health-card-top"><span>NETWORK HEALTH</span><span className="health-indicator"><i /> {components.length === 1 ? 'CONNECTED' : 'SPLIT NETWORK'}</span></div>
            <div className="health-score-row"><strong>{networkHealth}<span>%</span></strong><div className="health-score-caption"><span>COMPONENT COVERAGE</span><div className="health-meter"><i style={{ width: `${networkHealth}%` }} /></div></div></div>
            <div className="health-card-bottom"><span>{reachableNodes} / {graph.nodes.length} nodes reachable</span><span className="health-up">{components.length} {components.length === 1 ? 'component' : 'components'}</span></div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><span className="stat-icon blue"><Waypoints size={15} /></span><strong>{graph.nodes.length}</strong><span>NODES</span></div>
            <div className="stat-card"><span className="stat-icon green"><GitFork size={15} /></span><strong>{graph.edges.length}</strong><span>EDGES</span></div>
          </div>

          {activeView === 'route' && (
            <section className="analysis-block">
              <div className="section-heading"><span>ROUTE INSIGHTS</span><span className="section-tag">{activeAlgorithm.label.toUpperCase()}</span></div>
              <div className="insight-row"><span className="insight-icon yellow"><Route size={15} /></span><div><strong>{path.edgeIds.length} segments</strong><small>Selected shortest path</small></div><span className="insight-value">{formatWeight(path.totalWeight)}</span></div>
              <div className="insight-row"><span className="insight-icon cyan"><Crosshair size={15} /></span><div><strong>{selectedPathNodes.length} junctions</strong><small>Origin to destination</small></div><span className="insight-value">{selectedPathNodes.length ? `${Math.round((path.edgeIds.length / graph.edges.length) * 100)}%` : '—'}</span></div>
              <div className="insight-row"><span className="insight-icon purple"><Activity size={15} /></span><div><strong>{bridges.length} bridge links</strong><small>Critical connectors</small></div><button className="mini-open" onClick={() => setActiveView('connectivity')}><ArrowRight size={13} /></button></div>
            </section>
          )}

          {activeView === 'connectivity' && (
            <section className="analysis-block">
              <div className="section-heading"><span>CONNECTIVITY REPORT</span><span className="section-tag">DFS</span></div>
              <div className="report-banner success"><span><Check size={15} /></span><div><strong>{components.length === 1 ? 'Fully connected' : `${components.length} components found`}</strong><small>{components.length === 1 ? 'Every junction is reachable.' : 'Some junction groups cannot connect.'}</small></div></div>
              <div className="report-list"><div className="report-row"><span>Connected components</span><strong>{components.length}</strong></div><div className="report-row"><span>Bridge edges</span><strong className="accent-amber">{bridges.length}</strong></div><div className="report-row"><span>Largest component</span><strong>{Math.max(0, ...components.map((item) => item.length))} nodes</strong></div></div>
              {bridges.slice(0, 4).map((edge) => <div className="bridge-chip" key={edge.id}><span />{nodeById.get(edge.from)?.label} <ArrowRight size={11} /> {nodeById.get(edge.to)?.label}</div>)}
            </section>
          )}

          {activeView === 'mst' && (
            <section className="analysis-block">
              <div className="section-heading"><span>MINIMUM SPANNING TREE</span><span className="section-tag">{mstMethod.toUpperCase()}</span></div>
              <div className="method-switch"><button className={mstMethod === 'prim' ? 'selected' : ''} onClick={() => setMstMethod('prim')}>Prim</button><button className={mstMethod === 'kruskal' ? 'selected' : ''} onClick={() => setMstMethod('kruskal')}>Kruskal</button></div>
              <div className="mst-total"><span>TOTAL TREE WEIGHT</span><strong>{formatWeight(mstWeight)}</strong></div>
              <div className="report-list"><div className="report-row"><span>Edges in tree</span><strong>{mst.length} / {Math.max(0, graph.nodes.length - 1)}</strong></div><div className="report-row"><span>Vertices covered</span><strong>{graph.nodes.length}</strong></div><div className="report-row"><span>Average link</span><strong>{mst.length ? formatWeight(mstWeight / mst.length) : '—'}</strong></div></div>
              <div className="analysis-note blue-note"><span className="note-line" /> Blue links show the minimum-cost connection set.</div>
            </section>
          )}

          {activeView === 'eulerian' && (
            <section className="analysis-block">
              <div className="section-heading"><span>EULERIAN CHECK</span><span className="section-tag">HIERHOLZER</span></div>
              <div className={`report-banner ${eulerian.kind === 'none' ? 'warning' : 'success'}`}><span>{eulerian.kind === 'none' ? <CircleHelp size={15} /> : <Check size={15} />}</span><div><strong>{eulerianLabel}</strong><small>{eulerian.kind === 'circuit' ? 'Every link can be traversed once and return to start.' : eulerian.kind === 'path' ? 'Every link can be traversed once, with two endpoints.' : eulerian.reason}</small></div></div>
              {eulerian.kind !== 'none' && <div className="mst-total"><span>TRAIL LENGTH</span><strong>{eulerian.edgeIds.length} <small>edges</small></strong></div>}
              <div className="report-list"><div className="report-row"><span>Odd-degree junctions</span><strong>{graph.nodes.filter((node) => graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length % 2 === 1).length}</strong></div><div className="report-row"><span>Active component</span><strong>{components.length === 1 ? 'Connected' : 'Disconnected'}</strong></div></div>
              <div className="analysis-note"><span className="note-line" /> Try an Eulerian path/circuit graph from the graph selector above.</div>
            </section>
          )}

          <section className="quick-actions"><div className="section-heading"><span>QUICK ACTIONS</span></div><button onClick={() => setActiveView('connectivity')}><Network size={14} /> Run connectivity check <ArrowRight size={13} /></button><button onClick={() => setActiveView('mst')}><Trees size={14} /> Find minimum spanning tree <ArrowRight size={13} /></button><button onClick={() => setActiveView('eulerian')}><GitFork size={14} /> Check Eulerian trail <ArrowRight size={13} /></button></section>
          <div className="right-panel-foot"><span className="foot-dot" /> CALCULATIONS RUN LOCALLY <span className="foot-separator">·</span> NO BACKEND</div>
        </aside>
      </main>

      {!demoSignedIn && !showLogin && <button className="signed-out-pill" onClick={() => setShowLogin(true)}><UserRound size={14} /> Demo sign in</button>}
      {showLogin && (
        <div className="modal-backdrop" role="presentation">
          <div className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
            <button className="modal-close" onClick={() => setShowLogin(false)} aria-label="Close"><X size={17} /></button>
            <div className="demo-modal-mark"><Waypoints size={24} /></div>
            <span className="modal-kicker">FRONTEND DEMO ACCOUNT</span>
            <h2 id="demo-modal-title">Open your network workspace</h2>
            <p>Use the preloaded demo identity to explore route planning and graph analysis. No server or database is involved.</p>
            <label className="demo-credential"><span>EMAIL</span><strong>{DEMO_EMAIL}</strong></label>
            <label className="demo-credential"><span>DEMO PASSWORD</span><strong>{DEMO_PASSWORD}</strong></label>
            <button className="calculate-button modal-continue" onClick={signInDemo}><UserRound size={16} /> Continue as Alex Morgan <ArrowRight size={16} /></button>
            <div className="modal-privacy"><ShieldCheck size={13} /> Demo session stays on this device.</div>
          </div>
        </div>
      )}
      {toast && <div className="toast-message"><span><Check size={13} /></span>{toast}</div>}
    </div>
  )
}

export default App
