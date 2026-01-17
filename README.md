# Labyrinth Duel

A 1v1 real-time multiplayer game where two players compete in a fog-of-war labyrinth.

## Game Concept

Two players spawn in a randomly generated maze. Each player can only see a few tiles around them (fog of war).

### Win Conditions
1. **Capture the Flag**: Find the flag and escape through the exit
2. **Elimination**: Kill your opponent

### Core Mechanics
- Fog of war (limited visibility)
- Randomly generated labyrinth each match
- One flag spawns somewhere in the maze
- Players can fight when they meet
- Flag carrier must reach the exit to win

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 18+ with HTML Canvas |
| Backend API | Go + Gin framework |
| Real-time | Go + gorilla/websocket |
| Database | Firestore |
| Infrastructure | Terraform on GCP |
| Containers | Docker |

## Project Structure

```
game-project/
├── frontend/           # Angular app
├── backend/            # Go REST API (Gin)
├── websocket-server/   # Go WebSocket server
├── infrastructure/     # Terraform GCP configs
├── README.md
├── CLAUDE.md           # AI assistant context
└── NEXT_STEPS.md       # Development roadmap
```

## GCP Resources (Terraform-managed)

| Resource | Purpose |
|----------|---------|
| Cloud Run | Backend API |
| Compute Engine | WebSocket server |
| Cloud Storage | Angular static files |
| Firestore | Game data |
| Artifact Registry | Docker images |

## Getting Started

### Prerequisites
- Node.js 18+
- Go 1.21+
- Docker & Docker Compose
- Terraform
- GCP account (for deployment)

### Local Development

```bash
# Start all services
docker-compose up

# Or run individually:

# Frontend (Angular)
cd frontend && npm start

# Backend (Go)
cd backend && go run cmd/server/main.go

# WebSocket Server (Go)
cd websocket-server && go run cmd/server/main.go
```

## License

MIT
