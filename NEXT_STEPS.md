# Next Steps - Development Roadmap

## Current Phase: Project Setup

You're about to start building! Follow these steps in order.

---

## Phase 1: Project Setup

### Step 1.1: Create folder structure
```bash
mkdir -p game-project/{frontend,backend,websocket-server,infrastructure}
cd game-project
```

### Step 1.2: Initialize Angular frontend
```bash
cd frontend
npx @angular/cli@latest new game-frontend --directory . --routing --style=scss --ssr=false --skip-git
cd ..
```

### Step 1.3: Initialize Go backend
```bash
cd backend
go mod init labyrinth-duel/backend
go get github.com/gin-gonic/gin
go get github.com/gin-contrib/cors
go get cloud.google.com/go/firestore
cd ..
```

### Step 1.4: Initialize Go WebSocket server
```bash
cd websocket-server
go mod init labyrinth-duel/websocket
go get github.com/gorilla/websocket
cd ..
```

---

## Phase 2: Backend API (Go)

### Files to create:
- [ ] `backend/cmd/server/main.go` - Entry point
- [ ] `backend/internal/handlers/health.go` - Health check
- [ ] `backend/internal/handlers/rooms.go` - Room endpoints
- [ ] `backend/internal/models/room.go` - Room model
- [ ] `backend/internal/services/room_service.go` - Room logic

### Endpoints:
- [ ] `GET /api/health`
- [ ] `GET /api/rooms`
- [ ] `POST /api/rooms`
- [ ] `POST /api/rooms/:id/join`

---

## Phase 3: WebSocket Server (Go)

### Files to create:
- [ ] `websocket-server/cmd/server/main.go` - Entry point
- [ ] `websocket-server/internal/ws/handler.go` - WebSocket handler
- [ ] `websocket-server/internal/room/room.go` - Room state
- [ ] `websocket-server/internal/game/game.go` - Game loop
- [ ] `websocket-server/internal/game/maze.go` - Maze generation

### Features:
- [ ] Player connection/disconnection
- [ ] Room management
- [ ] Game state broadcasting (~30 ticks/sec)
- [ ] Maze generation algorithm

---

## Phase 4: Angular Frontend

### Components to create:
- [ ] `HomeComponent` - Create/join room UI
- [ ] `LobbyComponent` - Waiting for opponent
- [ ] `GameComponent` - Canvas game view

### Services to create:
- [ ] `ApiService` - HTTP calls to backend
- [ ] `GameService` - WebSocket connection
- [ ] `CanvasService` - Game rendering

### Features:
- [ ] Room creation UI
- [ ] Room joining with code
- [ ] Canvas-based maze rendering
- [ ] Player movement (WASD)
- [ ] Fog of war effect
- [ ] Flag and exit rendering

---

## Phase 5: Docker Setup

### Files to create:
- [ ] `docker-compose.yml`
- [ ] `frontend/Dockerfile`
- [ ] `backend/Dockerfile`
- [ ] `websocket-server/Dockerfile`

### Verify:
- [ ] All services start with `docker-compose up`
- [ ] Frontend accessible at `localhost:4200`
- [ ] Backend accessible at `localhost:3000`
- [ ] WebSocket accessible at `localhost:8080`

---

## Phase 6: Terraform (GCP)

### Files to create:
- [ ] `infrastructure/main.tf`
- [ ] `infrastructure/variables.tf`
- [ ] `infrastructure/outputs.tf`
- [ ] `infrastructure/modules/cloud-run/main.tf`
- [ ] `infrastructure/modules/compute/main.tf`
- [ ] `infrastructure/modules/storage/main.tf`

### Resources to provision:
- [ ] Artifact Registry (Docker images)
- [ ] Cloud Run (Backend API)
- [ ] Compute Engine (WebSocket server)
- [ ] Cloud Storage (Frontend static files)
- [ ] Firestore database

### Deploy:
- [ ] `terraform init`
- [ ] `terraform plan`
- [ ] `terraform apply`

---

## Phase 7: Polish & Testing

- [ ] Add proper error handling
- [ ] Add reconnection logic
- [ ] Add game end conditions
- [ ] Add basic sound effects (optional)
- [ ] Add mobile support (optional)
- [ ] Write tests

---

## Quick Reference

### Start developing:
```bash
# Terminal 1 - Frontend
cd frontend && ng serve

# Terminal 2 - Backend
cd backend && go run cmd/server/main.go

# Terminal 3 - WebSocket
cd websocket-server && go run cmd/server/main.go
```

### Or use Docker:
```bash
docker-compose up --build
```
