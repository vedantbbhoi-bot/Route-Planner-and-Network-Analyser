# Route Planner & Network Analyzer — implementation plan

## Implementation approach

- Build a single-page React + TypeScript interface with Vite, Tailwind CSS 4 and Lucide icons. Use React Leaflet for the real basemap, pan/zoom, GPS overlay, and graph-analysis overlays. Keep graph data and analysis calculations in local TypeScript modules.
- Use the OpenStreetMap standard raster tile service as the default real-world street basemap, with visible copyright attribution and requests limited to tiles the person is viewing. Make the tile URL and matching attribution overridable through public Vite environment variables so a different compliant provider can be configured without editing map-component logic. Respect the tile provider's caching behavior; do not prefetch or offer offline downloads.
- Keep a fine local street-grid layer optional above the basemap. Model the displayed route network as synthetic weighted graph data, not as road geometry obtained from OSM. State this limitation wherever the route is shown.
- Model the graph as weighted, undirected demo vertices and edges. Derive edge distances using haversine distance and multiply by a non-negative demo traffic factor. Implement Dijkstra, A*, Bellman–Ford, connectivity, low-link bridges, Prim, Kruskal, and Eulerian classification/trail traversal in client code. Document the formulas, conditions, and limitations separately in `MATHEMATICS.md`.
- Ask for browser geolocation only after the user presses “Use my location.” Show the exact returned GPS position as a map marker and display an accuracy-radius circle using the browser-reported accuracy. Center the real basemap and synthetic graph around that coordinate for the current page session; route origin still snaps to the nearest synthetic junction. Show permission/error states and disclose that tile requests reveal the viewed map area to the map provider, while GPS coordinates are not submitted to an app backend.
- Present a visible frontend demo identity (`demo@routely.app`, password text `route-demo-2026`) with Alex Morgan. The demo sign-in only toggles a local demo session flag; it is intentionally not secure authentication. Keep demo graph data bundled locally and do not add a backend/database.
- Preserve the supplied repository's existing README text, then append a clearly scoped “Current frontend demo” section with setup instructions, demo credentials, map/provider details, privacy behavior, and limitations so planned backend/API descriptions are not mistaken for a live service.

## Design direction

- **Design movement:** dark geospatial operations console with a real, legible street basemap beneath a restrained technical analysis overlay, guided by the user's screenshot.
- **Core principles:** map-first; real geography is distinct from synthetic graph data; analytical values remain legible; controls stay compact and direct.
- **Color philosophy:** ink-navy surfaces give the canvas depth; cyan marks live map structure; blue distinguishes the GPS fix; green and red mark route endpoints; yellow highlights the selected path; route families remain separable.
- **Layout paradigm:** persistent horizontal top bars; three-part desktop workstation with a narrow route rail, expansive central map canvas, and analysis rail; route controls become an off-canvas panel on small screens so the map remains the primary surface.
- **Signature elements:** real streets and place labels with an optional fine grid; a blue GPS accuracy halo; luminous, labeled synthetic graph nodes and color-coded links.
- **Interaction philosophy:** local demo actions update immediately; endpoint selection works through controls or map clicks; geolocation is an explicit opt-in; analysis stays linked to the synthetic graph and never implies verified road routing.
- **Animation:** short eased map recentering and discreet meter/panel transitions; respect reduced-motion preferences; avoid decorative motion that obscures graph state.
- **Typography system:** Manrope for readable UI, DM Mono for values and telemetry, with concise uppercase mono labels for secondary metadata.
- **Brand essence:** a compact graph-workbench for students and analysts to explore route and network algorithms without a live routing backend; analytical, clear, hands-on.
- **Brand voice:** concise and candid. Examples: “Choose two junctions to explore the network.” “The streets are real; this route overlay is demo data, not verified road directions.”
- **Wordmark & logo:** ROUTE in cool white and LAB in cyan, paired with a waypoints/connected-nodes mark; the app header uses Lucide Waypoints within a cyan-blue rounded square.
- **Signature brand color:** luminous cyan `#49D6FF`.

## Project structure

- `src/App.tsx` — page state, route inputs, demo account, geolocation consent/result, and analysis panels.
- `src/components/NetworkMap.tsx` — React Leaflet basemap, attribution, GPS accuracy marker, grid state, nodes, edges, overlays and map controls.
- `src/data/mapTiles.ts` — default OSM tile URL/attribution and public provider override configuration.
- `src/data/demoGraph.ts` — local city and Eulerian demo graphs, coordinate projection and haversine distance helper.
- `src/algorithms/graphAlgorithms.ts` — shortest paths, connected components, bridges, MSTs and Eulerian trails.
- `src/index.css` — dashboard visual system, responsive behavior, Leaflet controls and map overlay styling.
- `MATHEMATICS.md` — route-cost equations, algorithmic conditions and location/data-scope note.
- `Readme.md` — original project brief preserved with runnable UI-demo documentation appended.
- `TODO.md` — outcome-based requirements and current delivery statuses.
- `public/manus-routes.json` — the single-page route manifest.

## Dependencies and serving

The application uses the pinned pnpm lockfile and Vite dev/build scripts. Use Node.js 20.19+ or 22.12+ (the supported Vite engine range), run `pnpm install --frozen-lockfile`, then `pnpm dev` for local development or `pnpm build` for a static production build. No secrets, external API keys, database connection, or backend are required. A browser must be in a secure context (localhost or HTTPS) and the user must press the location action before geolocation is requested. Map tiles are loaded from the configured provider for the current viewport; attribution and privacy text remain visible.

## Material constraints and risks

- The basemap contains real streets from the selected tile provider, but the graph nodes and edges are synthetic. The demo does not provide geocoding, live traffic, road-snapped routes, or guaranteed travel times.
- GPS permission is browser-controlled and normally requires a secure context. The marker shows the browser's returned fix and reported accuracy; the route origin snaps to a nearby synthetic sample junction, which may not exist at that location.
- The default OSM-hosted tile service is best-effort and has no SLA. Follow its public tile usage policy, retain visible attribution, honor browser caching, do not prefetch, and choose a dedicated provider if future use exceeds a small interactive demo.
- Tile requests reveal the visible map area to the tile provider. GPS coordinates remain in the current browser session and are not sent to an app backend.
- Demo identity and password are intentionally public frontend strings; there is no access control. `localStorage` only stores whether the demo session was dismissed/signed out.
- Bellman–Ford is exposed as a selectable educational algorithm, but the undirected demo graph has non-negative costs; negative-weight-cycle behavior is not a product use case.
- The existing README describes future backend/database capabilities. Its original content remains intact; an appended scope section distinguishes the actual frontend demo from that design.
- No Vercel, Supabase, managed database, backend, or public deployment is part of this work.
