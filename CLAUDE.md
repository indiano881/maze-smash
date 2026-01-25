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
| Frontend | Angular 18+ with PixiJS 8 |
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

### Module Structure
The game uses a modular architecture with dependency injection via `GameContext`:

```
frontend/src/app/game/
├── game.component.ts      # Main component - orchestrates game loop
├── game-context.ts        # Shared context (Container, toIso, dimensions)
├── maze.ts                # Maze generation (recursive backtracking)
├── entities/              # Game objects (Player, Flag, Mole, pickups)
├── systems/               # FogSystem, HUDSystem
└── rendering/             # MazeRenderer
```

### GameContext Pattern
All modules receive a `GameContext` object containing:
- `staticContainer` - PixiJS Container for all game graphics
- `toIso(x, y)` - Converts grid coords to isometric screen position
- `getDepth(x, y, layer)` - Z-index calculation for depth sorting
- Tile dimensions and maze data

### Rendering
- Uses PixiJS 8 for isometric 2.5D rendering
- Grid-to-screen conversion: `x_screen = (x - y) * (tileWidth / 2)`
- Depth layers: floor (0) → backWall (10) → sprite (50) → frontWall (90)
- Garden theme colors defined in `GARDEN` constant (`game-context.ts`)

### Adding New Entities
1. Create class in `entities/` accepting `GameContext`
2. Implement `draw()`, `reset(x, y)`, `getGraphics()` methods
3. Add to `game.component.ts`: instantiate in `initEntities()`, draw in `drawMaze()`

### Maze System
- `Maze` class generates mazes using recursive backtracking algorithm
- `Cell` interface tracks walls on all four sides (top, right, bottom, left)
- `canMove(fromX, fromY, toX, toY)` validates movement against wall state

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

- **Fog of war**: Player visibility of 5 tiles (10 with Big Torch power-up)
- **Random maze generation** each match (10x10 grid)
- **Win condition**: Capture flag + escape through exit at bottom-right
- **Movement**: WASD or arrow keys
- **Controls**: E to smash wall (with Hammer), Q to shoot ice (with Ice Shard)

### Power-ups
- **Hammer** - Smash one wall in facing direction
- **Cloak** - 10 seconds of invisibility
- **Big Torch** - 10 seconds of extended visibility
- **Ice Shard** - Shootable projectile

### Enemies
- **Mole** - Burrows underground, surfaces to damage player (resets to start)

## Current Status

See NEXT_STEPS.md for the current development phase and pending tasks.
