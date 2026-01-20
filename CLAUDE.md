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
| Frontend | Angular 18+ with HTML Canvas |
| Backend API | Go + Gin framework |
| Real-time | Go + gorilla/websocket |
| Database | Firestore |
| Infrastructure | Terraform on GCP |

## Commands

```bash
# Frontend
cd frontend && ng serve              # Dev server at localhost:4200
cd frontend && ng build              # Production build
cd frontend && ng test               # Run tests

# Backend API
cd backend && go run cmd/server/main.go     # Run server
cd backend && go test ./...                 # Run all tests
cd backend && go test ./internal/handlers   # Run specific package tests

# WebSocket Server
cd websocket-server && go run cmd/server/main.go
cd websocket-server && go test ./...

# Docker
docker-compose up --build            # Start all services
docker-compose down                  # Stop all services

# Terraform
cd infrastructure && terraform init
cd infrastructure && terraform plan
cd infrastructure && terraform apply
```

## Architecture

### Service Communication
```
Browser <--HTTP--> Backend API (Gin)     <---> Firestore
   |                    |
   +---WebSocket----> WebSocket Server
                    (game state @ 30 ticks/sec)
```

### WebSocket Protocol

Client to Server:
- `{"type": "join", "roomId": "xxx", "playerId": "xxx"}`
- `{"type": "move", "x": 100, "y": 200}`
- `{"type": "attack"}`

Server to Client:
- `{"type": "gameState", "players": [...], "flag": {...}}`
- `{"type": "playerJoined", "player": {...}}`
- `{"type": "playerLeft", "playerId": "xxx"}`
- `{"type": "gameOver", "winner": "xxx", "reason": "flag|kill"}`

### REST API Endpoints

```
GET  /api/health          # Health check
GET  /api/rooms           # List active rooms
POST /api/rooms           # Create new room
POST /api/rooms/:id/join  # Join a room
```

## Game Mechanics

- **Fog of war**: Player sees ~3 tiles around them
- **Random maze generation** each match
- **Win conditions**: Capture flag + escape through exit, or kill opponent
- **Movement**: Free WASD movement

## Current Status

See NEXT_STEPS.md for the current development phase and pending tasks.
