package room

import (
	"sync"

	"labyrinth-duel/websocket/internal/game"
	"labyrinth-duel/websocket/internal/messages"
)

// Room represents a game room with its maze and players
type Room struct {
	ID      string
	Maze    *game.Maze
	Players map[string]*PlayerState
	mu      sync.RWMutex
}

// PlayerState tracks a player's position in a room
type PlayerState struct {
	ID string
	X  int
	Y  int
}

// Manager manages all active rooms
type Manager struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

// NewManager creates a new room manager
func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*Room),
	}
}

// GetOrCreateRoom gets existing room or creates new one with maze
func (m *Manager) GetOrCreateRoom(roomID string) *Room {
	m.mu.Lock()
	defer m.mu.Unlock()

	if room, exists := m.rooms[roomID]; exists {
		return room
	}

	// Create new room with maze
	room := &Room{
		ID:      roomID,
		Maze:    game.NewMaze(10, 10), // 10x10 maze
		Players: make(map[string]*PlayerState),
	}
	m.rooms[roomID] = room

	return room
}

// GetRoom returns a room if it exists
func (m *Manager) GetRoom(roomID string) *Room {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.rooms[roomID]
}

// AddPlayer adds a player to a room
func (r *Room) AddPlayer(playerID string, x, y int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Players[playerID] = &PlayerState{
		ID: playerID,
		X:  x,
		Y:  y,
	}
}

// RemovePlayer removes a player from a room
func (r *Room) RemovePlayer(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.Players, playerID)
}

// UpdatePlayerPosition updates a player's position
func (r *Room) UpdatePlayerPosition(playerID string, x, y int) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	player, exists := r.Players[playerID]
	if !exists {
		return false
	}

	// Validate move against maze
	if !r.Maze.CanMove(player.X, player.Y, x, y) {
		return false
	}

	player.X = x
	player.Y = y
	return true
}

// GetPlayers returns all players in the room
func (r *Room) GetPlayers() []messages.Player {
	r.mu.RLock()
	defer r.mu.RUnlock()

	players := make([]messages.Player, 0, len(r.Players))
	for _, p := range r.Players {
		players = append(players, messages.Player{
			ID: p.ID,
			X:  p.X,
			Y:  p.Y,
		})
	}
	return players
}

// IsEmpty returns true if room has no players
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Players) == 0
}
