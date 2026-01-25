package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"labyrinth-duel/websocket/internal/game"
	"labyrinth-duel/websocket/internal/messages"
	"labyrinth-duel/websocket/internal/room"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Global managers
var roomManager = room.NewManager()

// Client represents a connected WebSocket client
type Client struct {
	ID     string
	Conn   *websocket.Conn
	RoomID string
	mu     sync.Mutex
}

// Track all clients for broadcasting
var clients = make(map[string]*Client)
var clientsMu sync.RWMutex

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	port := ":8080"
	fmt.Printf("WebSocket server starting on %s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Create client with unique ID
	client := &Client{
		ID:   uuid.New().String()[:8],
		Conn: conn,
	}

	// Register client
	clientsMu.Lock()
	clients[client.ID] = client
	clientsMu.Unlock()

	fmt.Printf("Client %s connected\n", client.ID)

	// Send client their ID
	client.SendJSON(messages.ServerMessage{
		Type:    "connected",
		Message: client.ID,
	})

	// Handle messages
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		var msg messages.ClientMessage
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("JSON parse error: %v", err)
			continue
		}

		switch msg.Type {
		case "join":
			handleJoin(client, msg)
		case "move":
			handleMove(client, msg)
		}
	}

	// Cleanup on disconnect
	handleDisconnect(client)
}

func handleJoin(client *Client, msg messages.ClientMessage) {
	client.RoomID = msg.RoomID

	// Get or create room (creates maze if new)
	r := roomManager.GetOrCreateRoom(msg.RoomID)

	// Add player to room at starting position (0, 0)
	r.AddPlayer(client.ID, 0, 0)

	fmt.Printf("Client %s joined room %s\n", client.ID, msg.RoomID)

	// Convert maze to message format
	mazeData := convertMazeToMessage(r.Maze)

	// Send maze to the joining player
	client.SendJSON(messages.ServerMessage{
		Type:    "mazeData",
		Maze:    mazeData,
		Players: r.GetPlayers(),
	})

	// Notify other players in room
	broadcastToRoom(msg.RoomID, messages.ServerMessage{
		Type:    "playerJoined",
		Message: client.ID,
		Players: r.GetPlayers(),
	}, client.ID) // Exclude the joining player
}

func handleMove(client *Client, msg messages.ClientMessage) {
	if client.RoomID == "" {
		return
	}

	r := roomManager.GetRoom(client.RoomID)
	if r == nil {
		return
	}

	// Validate and update position (server validates against maze!)
	if !r.UpdatePlayerPosition(client.ID, msg.X, msg.Y) {
		fmt.Printf("Client %s invalid move to (%d, %d)\n", client.ID, msg.X, msg.Y)
		return
	}

	fmt.Printf("Client %s moved to (%d, %d)\n", client.ID, msg.X, msg.Y)

	// Broadcast to all players in room
	broadcastToRoom(client.RoomID, messages.ServerMessage{
		Type:    "gameState",
		Players: r.GetPlayers(),
	}, "")
}

func handleDisconnect(client *Client) {
	fmt.Printf("Client %s disconnected\n", client.ID)

	// Remove from clients map
	clientsMu.Lock()
	delete(clients, client.ID)
	clientsMu.Unlock()

	if client.RoomID != "" {
		r := roomManager.GetRoom(client.RoomID)
		if r != nil {
			r.RemovePlayer(client.ID)

			// Notify remaining players
			broadcastToRoom(client.RoomID, messages.ServerMessage{
				Type:    "playerLeft",
				Message: client.ID,
				Players: r.GetPlayers(),
			}, "")
		}
	}
}

// SendJSON sends a JSON message to the client
func (c *Client) SendJSON(msg messages.ServerMessage) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Conn.WriteJSON(msg)
}

// broadcastToRoom sends a message to all clients in a room
func broadcastToRoom(roomID string, msg messages.ServerMessage, excludeID string) {
	clientsMu.RLock()
	defer clientsMu.RUnlock()

	for _, c := range clients {
		if c.RoomID == roomID && c.ID != excludeID {
			c.SendJSON(msg)
		}
	}
}

// convertMazeToMessage converts game.Maze to messages.MazeData
func convertMazeToMessage(m *game.Maze) *messages.MazeData {
	cells := make([][]messages.Cell, m.Height)
	for y := 0; y < m.Height; y++ {
		cells[y] = make([]messages.Cell, m.Width)
		for x := 0; x < m.Width; x++ {
			cells[y][x] = messages.Cell{
				X:      m.Cells[y][x].X,
				Y:      m.Cells[y][x].Y,
				Top:    m.Cells[y][x].Top,
				Right:  m.Cells[y][x].Right,
				Bottom: m.Cells[y][x].Bottom,
				Left:   m.Cells[y][x].Left,
			}
		}
	}

	return &messages.MazeData{
		Width:  m.Width,
		Height: m.Height,
		Cells:  cells,
	}
}
