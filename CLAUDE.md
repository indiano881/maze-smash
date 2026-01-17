# CLAUDE.md - AI Assistant Context

## Project Overview

This is **Labyrinth Duel**, a 1v1 real-time multiplayer game. The user is building this project to learn:
- Angular (frontend)
- Go (backend)
- Terraform (infrastructure as code)
- GCP (cloud deployment)

## Important Context

- **User preference**: Provide commands for the user to run manually, don't execute bash commands directly
- **Learning focus**: The user wants to understand what they're building, not just copy-paste
- **Keep it simple**: Avoid over-engineering. Build incrementally.

## Tech Stack

- **Frontend**: Angular 18+ with HTML Canvas for game rendering
- **Backend API**: Go with Gin framework
- **WebSocket Server**: Go with gorilla/websocket
- **Database**: Firestore
- **Infrastructure**: Terraform deploying to GCP
- **Containers**: Docker + Docker Compose

## Project Structure

```
game-project/
├── frontend/           # Angular app
│   └── src/app/
│       ├── components/
│       │   ├── home/       # Landing page
│       │   ├── lobby/      # Waiting room
│       │   └── game/       # Canvas game view
│       └── services/
│           ├── api.service.ts
│           └── game.service.ts
│
├── backend/            # Go REST API
│   ├── cmd/server/     # Entry point
│   ├── internal/
│   │   ├── handlers/   # HTTP handlers
│   │   ├── models/     # Data models
│   │   └── services/   # Business logic
│   └── go.mod
│
├── websocket-server/   # Go WebSocket server
│   ├── cmd/server/     # Entry point
│   ├── internal/
│   │   ├── game/       # Game logic
│   │   ├── room/       # Room management
│   │   └── ws/         # WebSocket handling
│   └── go.mod
│
└── infrastructure/     # Terraform
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── modules/
        ├── cloud-run/
        ├── compute/
        └── storage/
```

## Game Mechanics

### Win Conditions
1. Find the flag and escape through exit
2. Kill your opponent

### Features to Implement
- Fog of war (player sees ~3 tiles around them)
- Random maze generation
- Flag spawns randomly
- Combat when players meet
- Free WASD movement

## WebSocket Message Protocol

```go
// Client -> Server
{"type": "join", "roomId": "xxx", "playerId": "xxx"}
{"type": "move", "x": 100, "y": 200}
{"type": "attack"}

// Server -> Client
{"type": "gameState", "players": [...], "flag": {...}}
{"type": "playerJoined", "player": {...}}
{"type": "playerLeft", "playerId": "xxx"}
{"type": "gameOver", "winner": "xxx", "reason": "flag|kill"}
```

## API Endpoints

```
GET  /api/health          # Health check
GET  /api/rooms           # List active rooms
POST /api/rooms           # Create new room
POST /api/rooms/:id/join  # Join a room
```

## Common Commands

```bash
# Frontend
cd frontend && ng serve

# Backend
cd backend && go run cmd/server/main.go

# WebSocket
cd websocket-server && go run cmd/server/main.go

# Docker
docker-compose up --build

# Terraform
cd infrastructure && terraform init && terraform plan
```

## Current Status

See NEXT_STEPS.md for the current development phase and pending tasks.
