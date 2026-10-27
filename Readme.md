# 🗺️ Route Planner and Network Analyzer

An interactive web application that bridges spatial data visualization and graph theory. **Route Planner and Network Analyzer** models geographical map data as graph network representations, allowing users to analyze connectivity, compute shortest paths, calculate minimum spanning trees, and discover Eulerian paths/circuits in real time.

---

## ✨ Features

* **Interactive Map Interface**: Render dynamic geographical maps and custom graph overlays using Leaflet.
* **Graph Representation**: Seamlessly map nodes (intersections/points of interest) and weighted edges (roads/connections).
* **Shortest Path Algorithms**: Compute optimal routes using Dijkstra's algorithm, A* search, and Bellman-Ford algorithms.
* **Network Connectivity Analysis**: Evaluate graph connectivity, strongly/weakly connected components, and bridge identification.
* **Minimum Spanning Trees (MST)**: Visualize optimal network coverage using Kruskal’s and Prim’s algorithms.
* **Eulerian Path & Circuit Solver**: Identify Eulerian paths and circuits for route optimization problems (e.g., street sweeping, garbage collection routing).
* **Spatial Data Persistence**: Store and query complex network topologies efficiently using PostgreSQL with PostGIS extensions.

---

## 🛠️ Tech Stack

### **Frontend**
* **React**: UI architecture and component management.
* **Leaflet & React-Leaflet**: Interactive map rendering and layer management.
* **Tailwind CSS / Lucide Icons**: Modern styling and interface iconography.

### **Backend**
* **Python**: Core runtime environment.
* **FastAPI**: High-performance asynchronous RESTful API framework.
* **NetworkX**: Comprehensive library for creating, manipulating, and studying complex network structures.

### **Database**
* **PostgreSQL + PostGIS**: Relational database management with spatial queries and geographic object support.

---

## 🏗️ System Architecture

```
 ┌─────────────────┐       HTTP / REST       ┌─────────────────┐
 │                 │ ─────────────────────>  │                 │
 │  React +        │                         │  FastAPI        │
 │  Leaflet        │ <─────────────────────  │  Backend        │
 │  (Frontend)     │       JSON Payload      │                 │
 └─────────────────┘                         └────────┬────────┘
                                                      │
                                    NetworkX Graphs   │ SQL Queries /
                                    & Algorithmic     │ Spatial Data
                                    Processing        │
                                                      ▼
                                             ┌─────────────────┐
                                             │ PostgreSQL      │
                                             │ + PostGIS       │
                                             └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
* **Node.js** (v18+) and **npm** / **yarn**
* **Python** (v3.10+)
* **PostgreSQL** with the **PostGIS** extension enabled

---

### 1. Database Setup

Create a PostgreSQL database and enable PostGIS:

```sql
CREATE DATABASE route_analyzer;
\c route_analyzer;
CREATE EXTENSION postgis;
```

---

### 2. Backend Setup (FastAPI + NetworkX)

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
echo "DATABASE_URL=postgresql://user:password@localhost:5432/route_analyzer" > .env

# Run database migrations / initialization scripts
python main.py
```

The API server will run at `http://localhost:8000`. You can view the OpenAPI interactive docs at `http://localhost:8000/docs`.

---

### 3. Frontend Setup (React + Leaflet)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The client application will run at `http://localhost:3000`.

---

## 🛰️ API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/graph` | Fetch nodes and edges within a specific bounding box |
| `POST` | `/api/v1/shortest-path` | Calculate shortest path between source and target nodes |
| `GET` | `/api/v1/connectivity` | Analyze connected components and network bridges |
| `GET` | `/api/v1/mst` | Calculate Minimum Spanning Tree (Prim's / Kruskal's) |
| `GET` | `/api/v1/eulerian` | Check Eulerian properties and return Eulerian path/circuit |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1. Fork the Repository
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.