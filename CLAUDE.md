# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Labyrinth Duel** - A 1v1 real-time multiplayer maze game. Two players compete in a fog-of-war labyrinth to either capture a flag and escape, or eliminate their opponent.

This is a learning project for: Angular, Go, Terraform, and GCP.

## Important Context

- **Provide commands for the user to run manually** - don't execute bash commands directly
- **Learning focus** - explain what's being built, avoid copy-paste solutions
- **Keep it simple** - avoid over-engineering, build incrementally

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 18+ with PixiJS |
| Backend API | Go + Gin framework |
| Real-time | Go + gorilla/websocket |
| Database | Firestore |
| Infrastructure | Terraform on GCP |

## Commands

```bash
# Frontend
cd frontend && npm start            # Dev server at localhost:4200
cd frontend && npm run build        # Production build

# Backend API (not yet implemented)
cd backend && go run cmd/server/main.go

# WebSocket Server (not yet implemented)
cd websocket-server && go run cmd/server/main.go

# Docker (not yet configured)
docker-compose up --build

# Terraform
cd infrastructure && terraform init
cd infrastructure && terraform plan
cd infrastructure && terraform apply
```

## Frontend Architecture

### Key Files
- `frontend/src/app/game/game.component.ts` - Main game component with PixiJS rendering
- `frontend/src/app/game/maze.ts` - Maze generation using recursive backtracking

### Rendering
- Uses PixiJS 8 for isometric 2.5D rendering
- Grid-to-screen conversion via `toIso(x, y)` method
- Depth sorting with `zIndex` for proper layering (floor → walls → sprites)

### Maze System
- `Maze` class generates mazes using recursive backtracking algorithm
- `Cell` interface tracks walls on all four sides
- `canMove()` validates movement against wall state

## Planned Architecture

### Service Communication
```
Browser <--HTTP--> Backend API (Gin)     <---> Firestore
   |                    |
   +---WebSocket----> WebSocket Server
                    (game state @ 30 ticks/sec)
```

### WebSocket Protocol (Planned)

Client to Server:
- `{"type": "join", "roomId": "xxx", "playerId": "xxx"}`
- `{"type": "move", "x": 100, "y": 200}`
- `{"type": "attack"}`

Server to Client:
- `{"type": "gameState", "players": [...], "flag": {...}}`
- `{"type": "playerJoined", "player": {...}}`
- `{"type": "playerLeft", "playerId": "xxx"}`
- `{"type": "gameOver", "winner": "xxx", "reason": "flag|kill"}`

### REST API Endpoints (Planned)

```
GET  /api/health          # Health check
GET  /api/rooms           # List active rooms
POST /api/rooms           # Create new room
POST /api/rooms/:id/join  # Join a room
```

## Game Mechanics

- **Fog of war**: Player sees ~3 tiles around them (not yet implemented)
- **Random maze generation** each match
- **Win conditions**: Capture flag + escape through exit, or kill opponent
- **Movement**: WASD or arrow keys

## Current Status

See NEXT_STEPS.md for the current development phase and pending tasks.
