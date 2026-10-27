# Route Planner & Network Analyzer — Mathematical Reference

This demo models a weighted, undirected graph \(G=(V,E)\). Vertices represent intersections or landmarks; edges represent traversable links. Demo coordinates and graph data are stored locally in the browser. The map overlay is illustrative and is not snapped to verified road geometry.

## 1. Geographic distance and edge cost

For latitude/longitude points \(u=(\phi_u,\lambda_u)\) and \(v=(\phi_v,\lambda_v)\), the haversine distance is

\[
\begin{aligned}
\Delta\phi &= \phi_v-\phi_u,\qquad \Delta\lambda=\lambda_v-\lambda_u,\\
a &= \sin^2(\Delta\phi/2)+\cos(\phi_u)\cos(\phi_v)\sin^2(\Delta\lambda/2),\\
d_{geo}(u,v) &= 2R\arcsin(\sqrt{a}),
\end{aligned}
\]

where angles are in radians and the mean Earth radius is \(R=6371\) km. Each edge has a non-negative traversal multiplier \(c_{uv}\ge 1\), representing the demo's relative cost factor. Its route weight is

\[
w(u,v)=d_{geo}(u,v)c_{uv}.
\]

The UI reports path weight in **km-equivalent cost**. It is a graph cost, not a promised travel time or a live-road distance.

## 2. Shortest paths

For a path \(P=(v_0,\ldots,v_k)\), its cost is

\[
W(P)=\sum_{i=0}^{k-1} w(v_i,v_{i+1}),
\qquad
P^*=\arg\min_{P:s\leadsto t} W(P).
\]

- **Dijkstra:** initialize \(d(s)=0\), all other labels to \(+\infty\); repeatedly settle the unsettled vertex with the smallest label and relax each edge:
  \[
  d(v)\leftarrow\min\{d(v),d(u)+w(u,v)\}.
  \]
  Dijkstra requires non-negative edge weights.
- **A\*:** prioritize vertices by \(f(v)=g(v)+h(v)\), where \(g(v)\) is the known cost from \(s\), and \(h(v)\) estimates remaining cost. The demo uses straight-line haversine distance to the destination; because each edge cost is at least its geographic distance, this is an admissible lower bound.
- **Bellman–Ford:** relax every directed orientation of each undirected edge for at most \(|V|-1\) passes, stopping early if a pass makes no change. The general directed-graph algorithm handles negative edges when no negative cycle is reachable; this app's undirected demo weights are non-negative.

For the app's simple array-based implementations, Dijkstra and A\* select the next frontier vertex by scanning current labels; the worst-case time is \(O(|V|^2+|E|)\). Bellman–Ford is \(O(|V||E|)\).

## 3. Minimum spanning tree

A spanning tree \(T\subseteq E\) connects all vertices without cycles and has \(|V|-1\) edges (for a connected graph). A minimum spanning tree is

\[
T^*=\arg\min_{T\text{ spans }V}\sum_{e\in T}w(e).
\]

- **Kruskal:** sort edges by weight and add an edge only when it joins two different components (disjoint-set union).
- **Prim:** grow one tree from a starting vertex, repeatedly adding the lightest edge crossing from the visited set to an unvisited vertex.

## 4. Connectivity and bridges

A connected component is a maximal set of vertices in which every pair is linked by a path. Breadth-first or depth-first search marks one component per traversal. The graph is connected exactly when there is one component (including the single-vertex case).

An edge \(e\) is a **bridge** if removing it increases the number of connected components. In a depth-first search tree, for tree edge \((u,v)\), the low-link test is

\[
\operatorname{low}(v)>\operatorname{disc}(u),
\]

where \(\operatorname{disc}(u)\) is the discovery time of \(u\), and \(\operatorname{low}(v)\) is the earliest discovery time reachable from \(v\)'s subtree using tree edges and at most one back edge.

## 5. Eulerian paths and circuits

The degree \(\deg(v)\) is the number of incident edges. Ignoring isolated vertices, an undirected graph has:

- an **Eulerian circuit** iff all active vertices belong to one connected component and every vertex has even degree;
- an **Eulerian path but not a circuit** iff all active vertices belong to one connected component and exactly two vertices have odd degree;
- **no Eulerian trail** otherwise.

Hierholzer's algorithm constructs the trail by following unused edges and splicing completed cycles until every edge has been used. Its running time is \(O(|V|+|E|)\).

## Scope note

All graph analysis runs client-side over the selected synthetic demo graph. When the user explicitly grants geolocation, the browser's returned position and reported accuracy are held in the current page session and shown as a marker and accuracy circle. The route origin still snaps to the nearest synthetic junction; this is not a road-snapped route. The basemap loads visible tiles from OpenStreetMap by default (or the provider configured with `VITE_MAP_TILE_URL`); tile requests reveal the map area being viewed to that provider. GPS coordinates are not submitted to an application backend, and no backend or database is present. The map shows required provider attribution and does not prefetch tiles. See the repository README for demo-account details and provider/privacy notes.
