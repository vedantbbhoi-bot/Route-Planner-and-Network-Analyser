import { useEffect, useMemo, useRef, useState } from 'react'
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
  Navigation,
  Network,
  Radio,
  Route,
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

interface BrowserLocation extends CenterPoint {
  accuracyMeters: number
  heading?: number | null
  speed?: number | null
}

const DEMO_USER_NAME = 'Vedant Bhoi'
const DEMO_EMAIL = 'vedant.bhoi@routelab.io'
const DEMO_ROLE = 'Lead Network Architect'
const DEMO_PASSWORD = 'route-matrix-2026'
const SESSION_KEY = 'routely-demo-session'

const VIEW_TABS: { id: AnalysisView; label: string; icon: typeof Route }[] = [
  { id: 'route', label: 'Route Planner', icon: Route },
  { id: 'connectivity', label: 'Topology & Bridges', icon: Network },
  { id: 'mst', label: 'Spanning Tree', icon: Trees },
  { id: 'eulerian', label: 'Eulerian Trail', icon: GitFork },
]

const ALGORITHM_OPTIONS: { id: ShortestPathMethod; label: string; hint: string }[] = [
  { id: 'dijkstra', label: 'Dijkstra', hint: 'Guaranteed optimal shortest path for non-negative graph metrics.' },
  { id: 'astar', label: 'A* Heuristic', hint: 'Guided Euclidean search prioritizing nodes closest to destination.' },
  { id: 'bellman-ford', label: 'Bellman-Ford', hint: 'Dynamic edge relaxation; resilient against arbitrary edge costs.' },
]

const PRESET_OPTIONS: { id: NetworkPreset; label: string }[] = [
  { id: 'city', label: 'Metropolitan Grid' },
  { id: 'eulerian-path', label: 'Eulerian Trail Topology' },
  { id: 'eulerian-circuit', label: 'Eulerian Circuit Topology' },
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

export default function App() {
  const [activeView, setActiveView] = useState<AnalysisView>('route')
  const [algorithm, setAlgorithm] = useState<ShortestPathMethod>('dijkstra')
  const [mstMethod, setMstMethod] = useState<SpanningTreeMethod>('kruskal')
  const [preset, setPreset] = useState<NetworkPreset>('city')
  const [center, setCenter] = useState<CenterPoint>(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState<BrowserLocation | null>(null)
  const [isLiveTracking, setIsLiveTracking] = useState(false)
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

  const watchIdRef = useRef<number | null>(null)

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
    if (origin && originText !== 'Current Location') setOriginText(origin.label)
    if (destination) setDestinationText(destination.label)
  }, [nodeById, originId, destinationId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!graph.nodes.some((node) => node.id === originId)) setOriginId(graph.nodes[0]?.id ?? '')
    if (!graph.nodes.some((node) => node.id === destinationId)) setDestinationId(graph.nodes.at(-1)?.id ?? '')
  }, [graph, originId, destinationId])

  // Automatic high-accuracy Real-Time Geolocation on initial load
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      return
    }

    setGeoStatus('requesting')
    setIsLiveTracking(true)

    // Immediate fix
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionSuccess(pos, true),
      () => {
        // Fallback or retry with lower precision if initial GPS lock fails
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => handlePositionSuccess(fallbackPos, true),
          (fallbackErr) => handlePositionError(fallbackErr),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    )

    // Continuous watchPosition for real-time tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handlePositionSuccess(pos, false)
      },
      (err) => {
        handlePositionError(err)
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const activeAlgorithm = ALGORITHM_OPTIONS.find((item) => item.id === algorithm)!
  const origin = nodeById.get(originId)
  const destination = nodeById.get(destinationId)
  const selectedPathNodes = path.nodeIds.map((id) => nodeById.get(id)).filter((node) => node !== undefined)
  const mstWeight = mst.reduce((sum, edge) => sum + edge.weight, 0)
  const reachableNodes = Math.max(0, ...components.map((component) => component.length))
  const networkHealth = graph.nodes.length ? Math.round((reachableNodes / graph.nodes.length) * 100) : 0
  const eulerianLabel = eulerian.kind === 'circuit' ? 'Eulerian Circuit Detected' : eulerian.kind === 'path' ? 'Open Eulerian Trail' : 'Non-Eulerian Graph'

  const notify = (message: string) => setToast(message)

  const handlePositionSuccess = (position: GeolocationPosition, snapOrigin = false) => {
    const nextLoc: BrowserLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    }
    setUserLocation(nextLoc)
    setGeoStatus('granted')

    // Always center the active network graph directly on the real user coordinates!
    setCenter((prev) => {
      // Re-center if difference is noticeable
      if (Math.abs(prev.lat - nextLoc.lat) > 0.0001 || Math.abs(prev.lng - nextLoc.lng) > 0.0001) {
        return { lat: nextLoc.lat, lng: nextLoc.lng }
      }
      return prev
    })

    if (snapOrigin) {
      const recenteredGraph = createDemoGraph({ lat: nextLoc.lat, lng: nextLoc.lng }, preset)
      let nearestNode: (typeof recenteredGraph.nodes)[number] | undefined
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const node of recenteredGraph.nodes) {
        const distance = haversineKm(nextLoc, node)
        if (distance < nearestDistance) {
          nearestNode = node
          nearestDistance = distance
        }
      }
      if (nearestNode) {
        setOriginId(nearestNode.id)
        setOriginText('Current Location')
      }
      notify(`GPS Synced: ${DEMO_USER_NAME} at ${nextLoc.lat.toFixed(4)}°, ${nextLoc.lng.toFixed(4)}° (±${Math.round(nextLoc.accuracyMeters)}m)`)
    }
  }

  const handlePositionError = (error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      setGeoStatus('denied')
      notify('GPS permission denied. Enable browser location for real-time map syncing.')
    } else {
      setGeoStatus('error')
    }
  }

  // Request single GPS fix
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      notify('Geolocation is unsupported in this environment.')
      return
    }
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionSuccess(pos, true),
      () => {
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => handlePositionSuccess(fallbackPos, true),
          handlePositionError,
          { enableHighAccuracy: false, timeout: 8000 },
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    )
  }

  // Toggle Continuous Real-Time Tracking
  const toggleRealtimeTracking = () => {
    if (!navigator.geolocation) {
      notify('Geolocation is not available.')
      return
    }

    if (isLiveTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsLiveTracking(false)
      notify('Live GPS stream paused.')
    } else {
      setIsLiveTracking(true)
      setGeoStatus('requesting')
      notify('Initiating real-time GPS tracking stream...')

      // Trigger immediate update
      navigator.geolocation.getCurrentPosition(
        (pos) => handlePositionSuccess(pos, true),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      )

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          handlePositionSuccess(pos, false)
        },
        (err) => {
          handlePositionError(err)
          setIsLiveTracking(false)
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      )
    }
  }

  const selectNodeFromMap = (nodeId: string) => {
    if (selectionTarget === 'origin') {
      setOriginId(nodeId)
      setOriginText(nodeById.get(nodeId)?.label ?? 'Selected junction')
      setSelectionTarget(null)
      notify('Origin junction locked.')
      return
    }
    if (selectionTarget === 'destination') {
      setDestinationId(nodeId)
      setDestinationText(nodeById.get(nodeId)?.label ?? 'Selected junction')
      setSelectionTarget(null)
      notify('Destination junction locked.')
      return
    }
    const node = nodeById.get(nodeId)
    if (node) notify(`${node.label} · ID ${node.id} · Connected to ${graph.edges.filter((e) => e.from === nodeId || e.to === nodeId).length} corridors`)
  }

  const runRoute = () => {
    setActiveView('route')
    setLastRun('Just now')
    notify(`Computed ${activeAlgorithm.label} optimal path.`)
  }

  const signInDemo = () => {
    setDemoSignedIn(true)
    setShowLogin(false)
    try { window.localStorage.setItem(SESSION_KEY, 'active') } catch { /* ignore */ }
    notify(`Welcome back, ${DEMO_USER_NAME}! Active session loaded.`)
  }

  const signOutDemo = () => {
    setDemoSignedIn(false)
    setAccountOpen(false)
    setShowLogin(true)
    try { window.localStorage.setItem(SESSION_KEY, 'signed-out') } catch { /* ignore */ }
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
  const statusLine = isLiveTracking
    ? `LIVE TELEMETRY STREAMING · Lat ${userLocation?.lat.toFixed(5)}° Lng ${userLocation?.lng.toFixed(5)}°`
    : geoStatus === 'requesting'
      ? 'Acquiring high-precision GPS satellite fix…'
      : geoStatus === 'granted'
        ? `Real GPS Active · User: ${DEMO_USER_NAME}`
        : geoStatus === 'denied'
          ? 'GPS permission denied · select a mapped junction'
          : 'Ready · Click junction to inspect or select from sidebar'

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Radio size={19} className="brand-pulse-icon" />
          </div>
          <div className="brand-copy">
            <span className="brand-name">ROUTE<span>LAB</span> <small className="brand-tag">OPENFREEMAP · GPS</small></span>
            <span className="brand-subtitle">TELEMETRY &amp; GRAPH ENGINE</span>
          </div>
        </div>

        <div className="topbar-center">
          <div className={`live-indicator ${isLiveTracking ? 'streaming' : ''}`}>
            <span /> {isLiveTracking ? 'LIVE SATELLITE STREAM' : 'OPENFREEMAP ENGINE'}
          </div>
          <div className="topbar-divider" />
          <div className="workspace-name">
            <span className="workspace-dot" /> {preset === 'city' ? 'Metropolitan Core' : 'Topology Testbed'}
          </div>
        </div>

        <div className="topbar-actions">
          <div className={`gps-badge-pill ${isLiveTracking ? 'active' : ''}`} onClick={toggleRealtimeTracking} title="Click to toggle real-time GPS stream">
            <Radio size={12} className={isLiveTracking ? 'pulse-fast' : ''} />
            <span>{isLiveTracking ? 'GPS: TRACKING' : userLocation ? 'GPS: LOCKED' : 'GPS: STANDBY'}</span>
          </div>

          <div className="demo-pill">
            <ShieldCheck size={13} /> {demoSignedIn ? DEMO_USER_NAME.toUpperCase() : 'DEMO USER'}
          </div>

          <button className="help-button" title="System architecture & info" onClick={() => notify('Interactive Leaflet OpenStreetMap visualizer with live browser geolocation.')}>
            <CircleHelp size={17} />
          </button>

          {/* Account Profile Flyout */}
          <div className="account-wrap">
            <button className="account-button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
              <span className="account-avatar">{demoSignedIn ? 'VB' : 'D'}</span>
              <span className="account-name">{demoSignedIn ? DEMO_USER_NAME : 'Sign in'}</span>
              <ChevronDown size={13} />
            </button>
            {accountOpen && (
              <div className="account-menu">
                <div className="account-menu-heading">
                  <span className="account-avatar large">VB</span>
                  <div>
                    <strong>{DEMO_USER_NAME}</strong>
                    <small>{DEMO_ROLE}</small>
                  </div>
                </div>
                <div className="account-menu-info">
                  <span>TELEMETRY ID</span>
                  <strong>{DEMO_EMAIL}</strong>
                  <span>GPS HARDWARE STATUS</span>
                  <div className="gps-status-row">
                    <span className={`signal-indicator ${userLocation ? 'online' : ''}`} />
                    <strong>{userLocation ? `Acquired (±${Math.round(userLocation.accuracyMeters)}m)` : 'Standby'}</strong>
                  </div>
                </div>
                <div className="account-menu-note">
                  Real Leaflet map connected with dark basemap tiles and browser Geolocation telemetry.
                </div>
                <button
                  className="account-menu-action"
                  onClick={demoSignedIn ? signOutDemo : () => { setShowLogin(true); setAccountOpen(false) }}
                >
                  {demoSignedIn ? <><LogOut size={15} /> Sign out session</> : <><UserRound size={15} /> Continue as {DEMO_USER_NAME}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* View Tabs Bar */}
      <nav className="view-tabs" aria-label="Analysis views">
        <div className="mobile-menu-button">
          <button onClick={() => setMobilePanelOpen((open) => !open)} aria-label="Toggle route panel">
            <Menu size={18} />
          </button>
        </div>
        {VIEW_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`view-tab ${activeView === id ? 'active' : ''}`} onClick={() => setActiveView(id)}>
            <Icon size={15} /> <span>{label}</span>
            {id === 'route' && <span className="tab-shortcut">⌘ 1</span>}
          </button>
        ))}
        <div className="view-tabs-spacer" />
        <label className="preset-select-wrap" aria-label="Choose graph demo">
          <span>TOPOLOGY</span>
          <select value={preset} onChange={(event) => onPresetChange(event.target.value as NetworkPreset)}>
            {PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={12} />
        </label>
        <div className="map-legend">
          <span className="legend-line route" /> Shortest Path
          <span className="legend-line network" /> Street Corridor
          <span className="legend-dot user-gps" /> Real GPS
        </div>
      </nav>

      {/* Main Grid Workspace */}
      <main className="workspace">
        {/* Left Side: Route Control & Parameters */}
        <aside className={`left-panel ${mobilePanelOpen ? 'panel-open' : ''}`}>
          <div className="panel-kicker">
            <span className="kicker-dot" /> NAVIGATION CONSOLE
            <span className="panel-step">REALTIME</span>
          </div>
          <div className="panel-title-row">
            <div>
              <h1>Route Planner</h1>
              <p>Real-time graph pathfinding &amp; telemetry.</p>
            </div>
            <button
              className={`icon-only subtle ${isLiveTracking ? 'pulse-fast text-cyan-400' : ''}`}
              aria-label="Toggle Live GPS"
              title={isLiveTracking ? 'Pause live tracking' : 'Start live GPS tracking'}
              onClick={toggleRealtimeTracking}
            >
              <Navigation size={16} />
            </button>
          </div>

          {/* User Card Badge */}
          <div className="user-profile-card">
            <div className="user-profile-avatar">VB</div>
            <div className="user-profile-info">
              <span className="user-label">LOGGED IN AS</span>
              <strong>{DEMO_USER_NAME}</strong>
              <small>{userLocation ? `GPS Lock: ${userLocation.lat.toFixed(4)}°, ${userLocation.lng.toFixed(4)}°` : 'GPS Ready (Click "Use My GPS")'}</small>
            </div>
            <button
              className={`user-gps-toggle ${isLiveTracking ? 'tracking' : ''}`}
              title="Continuous Real-Time GPS Tracking"
              onClick={toggleRealtimeTracking}
            >
              {isLiveTracking ? <Radio size={14} /> : <LocateFixed size={14} />}
            </button>
          </div>

          <section className="route-form-card" aria-label="Route endpoints">
            <div className="route-form-head">
              <span>WAYPOINTS</span>
              <span className="form-status"><span /> READY</span>
            </div>

            <div className="endpoint-row origin-row">
              <div className="endpoint-rail">
                <span className="endpoint-dot origin-dot" />
                <span className="endpoint-line" />
              </div>
              <label className="endpoint-field">
                <span>START POINT</span>
                <select
                  value={originId}
                  onChange={(event) => {
                    setOriginId(event.target.value)
                    setOriginText(nodeById.get(event.target.value)?.label ?? '')
                  }}
                >
                  {graph.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.id === originId && originText === 'Current Location'
                        ? `Live GPS Position · ${node.label}`
                        : node.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={`location-button ${geoStatus === 'requesting' ? 'loading' : ''} ${userLocation ? 'locked' : ''}`}
                title="Locate my real device via browser GPS"
                onClick={requestLocation}
                disabled={geoStatus === 'requesting'}
              >
                <LocateFixed size={15} />
                <span>{geoStatus === 'requesting' ? 'Acquiring...' : userLocation ? 'GPS Synced' : 'Use My GPS'}</span>
              </button>
            </div>

            <div className="endpoint-row destination-row">
              <div className="endpoint-rail">
                <span className="endpoint-dot destination-dot" />
              </div>
              <label className="endpoint-field">
                <span>DESTINATION</span>
                <select
                  value={destinationId}
                  onChange={(event) => {
                    setDestinationId(event.target.value)
                    setDestinationText(nodeById.get(event.target.value)?.label ?? '')
                  }}
                >
                  {graph.nodes.map((node) => (
                    <option key={node.id} value={node.id}>{node.label}</option>
                  ))}
                </select>
              </label>
              <button
                className="endpoint-pick-button"
                title="Choose a destination by clicking on the map"
                onClick={() => setSelectionTarget('destination')}
              >
                <MapPin size={15} />
              </button>
            </div>

            {(geoStatus === 'denied' || geoStatus === 'unsupported' || geoStatus === 'error') && (
              <div className="geo-message">
                <Crosshair size={13} />
                {geoStatus === 'denied'
                  ? 'Permission denied — choose a mapped junction.'
                  : geoStatus === 'unsupported'
                    ? 'Geolocation unavailable in this browser.'
                    : 'Could not read GPS location.'}
              </div>
            )}

            <button
              className="swap-button"
              aria-label="Swap origin and destination"
              onClick={() => {
                setOriginId(destinationId)
                setDestinationId(originId)
                setOriginText(destinationText)
                setDestinationText(originText)
              }}
            >
              <ArrowDownUp size={14} />
            </button>
          </section>

          {/* Algorithm Selector */}
          <section className="algorithm-section">
            <div className="section-heading">
              <span>SOLVER ALGORITHM</span>
              <button title="Algorithm details" onClick={() => notify(activeAlgorithm.hint)}>
                <CircleHelp size={14} />
              </button>
            </div>
            <div className="algorithm-grid">
              {ALGORITHM_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`algorithm-choice ${algorithm === option.id ? 'selected' : ''}`}
                  onClick={() => setAlgorithm(option.id)}
                >
                  <span className="algorithm-check">{algorithm === option.id ? <Check size={11} /> : null}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="algorithm-hint">
              <Zap size={13} />
              <span>{activeAlgorithm.hint}</span>
            </div>
          </section>

          <button className="calculate-button" onClick={runRoute}>
            <Route size={16} /> Compute Trajectory <ArrowRight size={16} />
          </button>

          {/* Route Performance Metrics */}
          <section className="route-result-card">
            <div className="result-topline">
              <span><span className="result-pulse" /> OPTIMAL TRAJECTORY</span>
              <span className="result-time"><Clock3 size={12} /> {lastRun}</span>
            </div>
            {path.nodeIds.length ? (
              <>
                <div className="result-metrics">
                  <div>
                    <strong>{formatWeight(path.totalWeight)}</strong>
                    <span>ESTIMATED WEIGHT</span>
                  </div>
                  <div>
                    <strong>{path.edgeIds.length} <small>links</small></strong>
                    <span>CORRIDOR LENGTH</span>
                  </div>
                </div>
                <div className="result-progress">
                  <div style={{ width: `${Math.max(pathPercentage, 12)}%` }} />
                </div>
                <div className="path-preview">
                  <div className="path-endpoint">
                    <span className="mini-origin" />
                    <span>{origin?.label ?? originText}</span>
                  </div>
                  <div className="path-preview-line">
                    <span>{path.nodeIds.length} nodes</span>
                    <i />
                  </div>
                  <div className="path-endpoint">
                    <span className="mini-destination" />
                    <span>{destination?.label ?? destinationText}</span>
                  </div>
                </div>
                <div className="result-footnote">
                  <Sparkles size={12} /> Solved via {activeAlgorithm.label} in &lt;1ms
                </div>
              </>
            ) : (
              <div className="empty-result">No valid corridor connects these endpoints in the current graph.</div>
            )}
          </section>

          <section className="panel-footer-note">
            <ShieldCheck size={14} />
            <span>OpenStreetMap live tiles active. GPS coordinates remain local to client sandbox.</span>
          </section>
        </aside>

        {/* Center: Real Leaflet Map */}
        <section className="map-stage" aria-label="Interactive graph map">
          <div className="map-stage-toolbar">
            <div className="map-title">
              <span className="map-title-icon"><Compass size={16} /></span>
              <div>
                <strong>Metropolitan Street Map</strong>
                <small>OpenStreetMap Tiles · {graph.nodes.length} junctions · {graph.edges.length} corridors</small>
              </div>
            </div>
            <div className="map-stage-actions">
              <button className="map-action-button" onClick={() => setSelectionTarget('origin')}>
                <span className="action-dot start" /> Set origin
              </button>
              <button className="map-action-button" onClick={() => setSelectionTarget('destination')}>
                <span className="action-dot end" /> Set destination
              </button>
              <button
                className={`map-action-button highlight ${isLiveTracking ? 'active-pulse' : ''}`}
                onClick={toggleRealtimeTracking}
                title="Continuous Real-time Geolocation tracking"
              >
                <Radio size={13} />
                <span>{isLiveTracking ? 'Live Stream On' : 'Live Track'}</span>
              </button>
            </div>
          </div>

          <div className="map-viewport">
            <NetworkMap
              graph={graph}
              center={center}
              userLocation={userLocation}
              isTracking={isLiveTracking}
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
              onToggleTracking={toggleRealtimeTracking}
            />

            <div className="map-badge">
              <span className={`map-badge-dot ${isLiveTracking ? 'pulsing-fast' : ''}`} />
              <span>{isLiveTracking ? 'REALTIME TELEMETRY STREAM' : 'OPENFREEMAP VECTOR LAYER'}</span>
            </div>

            <div className="map-coordinates">
              <span>LAT {userLocation ? userLocation.lat.toFixed(5) : center.lat.toFixed(4)}</span>
              <i />
              <span>LNG {userLocation ? userLocation.lng.toFixed(5) : center.lng.toFixed(4)}</span>
              {userLocation && (
                <>
                  <i />
                  <span className="gps-acc-badge">±{Math.round(userLocation.accuracyMeters)}m</span>
                </>
              )}
            </div>

            <div className="map-user-pill">
              <span className="avatar-chip">VB</span>
              <div className="user-pill-text">
                <strong>{DEMO_USER_NAME}</strong>
                <small>{userLocation ? 'GPS Online' : 'Map Centered'}</small>
              </div>
            </div>
          </div>

          <div className="map-statusbar">
            <div className="map-status-message">
              <span className={isLiveTracking ? 'status-dot pulse-emerald' : geoStatus === 'granted' ? 'status-dot green' : 'status-dot'} />
              {statusLine}
            </div>
            <div className="map-status-right">
              <span><i className="signal-bars"><b /><b /><b /></i> SATELLITE LOCK</span>
              <span>OPENFREEMAP (NO KEY REQUIRED)</span>
            </div>
          </div>
        </section>

        {/* Right Side: Graph Analysis & Insights */}
        <aside className="right-panel">
          <div className="right-panel-head">
            <div>
              <span className="panel-kicker">NETWORK TELEMETRY</span>
              <h2>Analysis Deck</h2>
            </div>
            <button className="icon-only subtle" aria-label="Analysis information" onClick={() => notify('Graph metrics dynamically evaluated on client web runtime.')}>
              <CircleHelp size={15} />
            </button>
          </div>

          <div className="health-card">
            <div className="health-card-top">
              <span>NETWORK CONNECTIVITY</span>
              <span className="health-indicator"><i /> {components.length === 1 ? 'FULLY LINKED' : 'PARTITIONED'}</span>
            </div>
            <div className="health-score-row">
              <strong>{networkHealth}<span>%</span></strong>
              <div className="health-score-caption">
                <span>JUNCTION REACHABILITY</span>
                <div className="health-meter"><i style={{ width: `${networkHealth}%` }} /></div>
              </div>
            </div>
            <div className="health-card-bottom">
              <span>{reachableNodes} / {graph.nodes.length} nodes reachable</span>
              <span className="health-up">{components.length} {components.length === 1 ? 'component' : 'components'}</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon blue"><Waypoints size={15} /></span>
              <strong>{graph.nodes.length}</strong>
              <span>JUNCTIONS</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon green"><GitFork size={15} /></span>
              <strong>{graph.edges.length}</strong>
              <span>CORRIDORS</span>
            </div>
          </div>

          {activeView === 'route' && (
            <section className="analysis-block">
              <div className="section-heading">
                <span>PATH TELEMETRY</span>
                <span className="section-tag">{activeAlgorithm.label.toUpperCase()}</span>
              </div>
              <div className="insight-row">
                <span className="insight-icon yellow"><Route size={15} /></span>
                <div>
                  <strong>{path.edgeIds.length} segments</strong>
                  <small>Selected optimal path</small>
                </div>
                <span className="insight-value">{formatWeight(path.totalWeight)}</span>
              </div>
              <div className="insight-row">
                <span className="insight-icon cyan"><Crosshair size={15} /></span>
                <div>
                  <strong>{selectedPathNodes.length} nodes traversed</strong>
                  <small>Origin to destination</small>
                </div>
                <span className="insight-value">{selectedPathNodes.length ? `${Math.round((path.edgeIds.length / graph.edges.length) * 100)}%` : '—'}</span>
              </div>
              <div className="insight-row">
                <span className="insight-icon purple"><Activity size={15} /></span>
                <div>
                  <strong>{bridges.length} critical bridges</strong>
                  <small>Vulnerable connectors</small>
                </div>
                <button className="mini-open" onClick={() => setActiveView('connectivity')}>
                  <ArrowRight size={13} />
                </button>
              </div>
            </section>
          )}

          {activeView === 'connectivity' && (
            <section className="analysis-block">
              <div className="section-heading">
                <span>CONNECTIVITY &amp; BRIDGES</span>
                <span className="section-tag">TARJAN DFS</span>
              </div>
              <div className="report-banner success">
                <span><Check size={15} /></span>
                <div>
                  <strong>{components.length === 1 ? 'Fully Connected' : `${components.length} Sub-networks`}</strong>
                  <small>{components.length === 1 ? 'All junctions can exchange traffic.' : 'Isolated subnetworks exist.'}</small>
                </div>
              </div>
              <div className="report-list">
                <div className="report-row">
                  <span>Connected components</span>
                  <strong>{components.length}</strong>
                </div>
                <div className="report-row">
                  <span>Critical bridges</span>
                  <strong className="accent-amber">{bridges.length}</strong>
                </div>
                <div className="report-row">
                  <span>Largest component</span>
                  <strong>{Math.max(0, ...components.map((item) => item.length))} nodes</strong>
                </div>
              </div>
              {bridges.slice(0, 4).map((edge) => (
                <div className="bridge-chip" key={edge.id}>
                  <span />
                  {nodeById.get(edge.from)?.label} <ArrowRight size={11} /> {nodeById.get(edge.to)?.label}
                </div>
              ))}
            </section>
          )}

          {activeView === 'mst' && (
            <section className="analysis-block">
              <div className="section-heading">
                <span>MINIMUM SPANNING TREE</span>
                <span className="section-tag">{mstMethod.toUpperCase()}</span>
              </div>
              <div className="method-switch">
                <button className={mstMethod === 'prim' ? 'selected' : ''} onClick={() => setMstMethod('prim')}>Prim</button>
                <button className={mstMethod === 'kruskal' ? 'selected' : ''} onClick={() => setMstMethod('kruskal')}>Kruskal</button>
              </div>
              <div className="mst-total">
                <span>TOTAL SPANNING COST</span>
                <strong>{formatWeight(mstWeight)}</strong>
              </div>
              <div className="report-list">
                <div className="report-row">
                  <span>Tree edges</span>
                  <strong>{mst.length} / {Math.max(0, graph.nodes.length - 1)}</strong>
                </div>
                <div className="report-row">
                  <span>Vertices spanned</span>
                  <strong>{graph.nodes.length}</strong>
                </div>
                <div className="report-row">
                  <span>Average edge</span>
                  <strong>{mst.length ? formatWeight(mstWeight / mst.length) : '—'}</strong>
                </div>
              </div>
              <div className="analysis-note blue-note">
                <span className="note-line" /> Sky-blue edges highlight minimum redundancy wiring.
              </div>
            </section>
          )}

          {activeView === 'eulerian' && (
            <section className="analysis-block">
              <div className="section-heading">
                <span>EULERIAN ANALYSIS</span>
                <span className="section-tag">HIERHOLZER</span>
              </div>
              <div className={`report-banner ${eulerian.kind === 'none' ? 'warning' : 'success'}`}>
                <span>{eulerian.kind === 'none' ? <CircleHelp size={15} /> : <Check size={15} />}</span>
                <div>
                  <strong>{eulerianLabel}</strong>
                  <small>
                    {eulerian.kind === 'circuit'
                      ? 'Every link can be traversed once and return to start.'
                      : eulerian.kind === 'path'
                        ? 'Every link can be traversed once with distinct start/end.'
                        : eulerian.reason}
                  </small>
                </div>
              </div>
              {eulerian.kind !== 'none' && (
                <div className="mst-total">
                  <span>TRAIL LENGTH</span>
                  <strong>{eulerian.edgeIds.length} <small>edges</small></strong>
                </div>
              )}
              <div className="report-list">
                <div className="report-row">
                  <span>Odd-degree vertices</span>
                  <strong>{graph.nodes.filter((node) => graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length % 2 === 1).length}</strong>
                </div>
                <div className="report-row">
                  <span>Graph parity</span>
                  <strong>{components.length === 1 ? 'Single Component' : 'Split Graph'}</strong>
                </div>
              </div>
            </section>
          )}

          <section className="quick-actions">
            <div className="section-heading"><span>QUICK ACTIONS</span></div>
            <button onClick={() => setActiveView('connectivity')}><Network size={14} /> Analyze Connectivity <ArrowRight size={13} /></button>
            <button onClick={() => setActiveView('mst')}><Trees size={14} /> Calculate Spanning Tree <ArrowRight size={13} /></button>
            <button onClick={() => setActiveView('eulerian')}><GitFork size={14} /> Validate Eulerian Trail <ArrowRight size={13} /></button>
          </section>

          <div className="right-panel-foot">
            <span className="foot-dot" /> LIVE TELEMETRY ENGINE <span className="foot-separator">·</span> LOCAL CLIENT
          </div>
        </aside>
      </main>

      {/* Demo Sign-in Modal */}
      {!demoSignedIn && !showLogin && (
        <button className="signed-out-pill" onClick={() => setShowLogin(true)}>
          <UserRound size={14} /> Demo session: {DEMO_USER_NAME}
        </button>
      )}

      {showLogin && (
        <div className="modal-backdrop" role="presentation">
          <div className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
            <button className="modal-close" onClick={() => setShowLogin(false)} aria-label="Close"><X size={17} /></button>
            <div className="demo-modal-mark"><Waypoints size={24} /></div>
            <span className="modal-kicker">NETWORK CONTROL ACCESS</span>
            <h2 id="demo-modal-title">Welcome, {DEMO_USER_NAME}</h2>
            <p>Access the real-time GIS map visualizer and discrete math graph analysis workspace.</p>
            <label className="demo-credential">
              <span>USER IDENTITY</span>
              <strong>{DEMO_USER_NAME}</strong>
            </label>
            <label className="demo-credential">
              <span>SYSTEM EMAIL</span>
              <strong>{DEMO_EMAIL}</strong>
            </label>
            <label className="demo-credential">
              <span>ACCESS KEY</span>
              <strong>{DEMO_PASSWORD}</strong>
            </label>
            <button className="calculate-button modal-continue" onClick={signInDemo}>
              <UserRound size={16} /> Enter Console as {DEMO_USER_NAME} <ArrowRight size={16} />
            </button>
            <div className="modal-privacy"><ShieldCheck size={13} /> Active session authenticated locally.</div>
          </div>
        </div>
      )}

      {/* Floating System Notification */}
      {toast && (
        <div className="toast-message">
          <span><Check size={13} /></span>
          {toast}
        </div>
      )}
    </div>
  )
}
