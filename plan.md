# Implementation plan — Route Planner & Network Analyzer

## Product scope

Deliver a frontend-first, usable route-planning and network-analysis demo based on the supplied README and dark map screenshot. The user explicitly prioritizes the UI, authorizes incremental pushes to `vedantbbhoi-bot/Route-Planner-and-Network-Analyser`, and says there is no need for a Vercel or Supabase deployment. This implementation does not provision a backend, database, hosting, or authentication service. The README's FastAPI/PostGIS/API design remains documented as a possible future architecture and is not represented as active functionality.

## Implementation approach

- Build a single-page React + TypeScript interface with Vite, Tailwind CSS 4 and Lucide icons. Use Leaflet/React-Leaflet for pan/zoom and plotting graph overlays. Keep all graph data and graph-analysis calculations in local TypeScript modules.
- Render an original, local CSS street-grid canvas under the graph rather than depending on external tile services. This keeps the map view available in environments where map tiles are blocked and avoids sending a GPS-derived viewport to a third-party tile provider. Describe it as an illustrative graph canvas, not a real or road-snapped basemap.
- Model the graph as weighted, undirected demo vertices and edges. Derive edge distances using haversine distance and multiply by a non-negative demo traffic factor. Implement Dijkstra, A*, Bellman–Ford, connectivity, low-link bridges, Prim, Kruskal, and Eulerian classification/trail traversal in client code. Document the formulas, conditions, and limitations separately in `MATHEMATICS.md`.
- Ask for browser geolocation only after the user presses “Use my location.” Use the position in the current page session to recenter the illustrative graph and choose its nearest synthetic junction as the route origin. Show permission/error states and disclose that this is not a real-world routable map.
- Present a visible frontend demo identity (`demo@routely.app`, password text `route-demo-2026`) with Alex Morgan. The demo sign-in only toggles a local demo session flag; it is intentionally not secure authentication. Keep demo graph data bundled locally and do not add a backend/database.
- Preserve the supplied repository's existing README text, then append a clearly scoped “Current frontend demo” section with setup instructions, demo credentials and limitations so planned backend/API descriptions are not mistaken for a live service.

## Design direction

- **Design movement:** dark geospatial operations console with a restrained technical-grid aesthetic, guided directly by the user's screenshot.
- **Core principles:** map-first; graph clarity over geographic realism; analytical values remain legible; controls stay compact and direct.
- **Color philosophy:** ink-navy surfaces give the canvas depth; cyan signals active map structure; green and red distinguish endpoints; yellow highlights the selected path; blue, green and red route families stay separable.
- **Layout paradigm:** persistent horizontal top bars; three-part desktop workstation with a narrow route rail, expansive central graph canvas, and analysis rail; route controls become an off-canvas panel on small screens so the map remains the primary surface.
- **Signature elements:** fine local street-grid and diagonal arterials; luminous, labeled graph junctions; high-contrast color-coded edge overlays.
- **Interaction philosophy:** local demo actions update immediately; endpoint selection works through controls or map clicks; location is an explicit opt-in; analysis stays linked to the selected graph.
- **Animation:** short eased map recentering and discreet meter/panel transitions; respect reduced-motion preferences; avoid decorative motion that obscures graph state.
- **Typography system:** Manrope for readable UI, DM Mono for values and telemetry, with concise uppercase mono labels for secondary metadata.
- **Brand essence:** a compact graph-workbench for students and analysts to explore route and network algorithms without a live-data dependency; analytical, clear, hands-on.
- **Brand voice:** concise and candid. Examples: “Choose two junctions to explore the network.” “Demo network only—the overlay is illustrative, not verified road geometry.”
- **Wordmark & logo:** ROUTE in cool white and LAB in cyan, paired with a waypoints/connected-nodes mark; the app header uses Lucide Waypoints within a cyan-blue rounded square.
- **Signature brand color:** luminous cyan `#49D6FF`.

## Project structure

- `src/App.tsx` — page state, route inputs, demo account, algorithm selection and analysis panels.
- `src/components/NetworkMap.tsx` — Leaflet interaction layer, locally rendered grid state, nodes, edges, overlays and map controls.
- `src/data/demoGraph.ts` — local city and Eulerian demo graphs, coordinate projection and haversine distance helper.
- `src/algorithms/graphAlgorithms.ts` — shortest paths, connected components, bridges, MSTs and Eulerian trails.
- `src/index.css` — dashboard visual system, responsive behavior and map-grid treatment.
- `MATHEMATICS.md` — route-cost equations, algorithmic conditions and privacy/scope note.
- `Readme.md` — original project brief preserved with the runnable UI-demo documentation appended.
- `TODO.md` — outcome-based requirements and current delivery statuses.
- `public/manus-routes.json` — the single-page route manifest.

## Dependencies and serving

The web application uses the pinned pnpm lockfile and Vite dev/build scripts. Use Node.js 20.19+ or 22.12+ (the supported Vite engine range), run `pnpm install --frozen-lockfile`, then `pnpm dev` for local development or `pnpm build` for a static production build. No secrets, external API keys, database connection, or backend are required. The local screenshot/reference image informs styling; no image search or remote tile API is part of the design.

## Material constraints and risks

- Demo graph coordinates and edges are synthetic. The graph canvas does not provide real map roads, geocoding, live traffic, directions, or guaranteed travel times.
- GPS permission is browser-controlled and normally requires a secure context. The returned location recenters synthetic points and snaps to the closest sample junction; it does not imply that junction exists at the user's actual location.
- Demo identity and password are intentionally public frontend strings; there is no access control. `localStorage` only stores whether the demo session was dismissed/signed out.
- Bellman–Ford is exposed as a selectable educational algorithm, but the undirected demo graph has non-negative costs; negative-weight-cycle behavior is not a product use case.
- The existing README describes future backend/database capabilities. Its original content remains intact; an appended scope section distinguishes the actual frontend demo from that design.
- No Vercel, Supabase, managed database, backend, or public deployment is part of this work.
