package messages

// ClientMessage is what we receive from the browser
type ClientMessage struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId,omitempty"`
	X      int    `json:"x,omitempty"`
	Y      int    `json:"y,omitempty"`
}

// ServerMessage is what we send to the browser
type ServerMessage struct {
	Type    string    `json:"type"`
	Players []Player  `json:"players,omitempty"`
	Message string    `json:"message,omitempty"`
	Maze    *MazeData `json:"maze,omitempty"`
}

// Player represents a player's state
type Player struct {
	ID string `json:"id"`
	X  int    `json:"x"`
	Y  int    `json:"y"`
}

// MazeData represents maze data sent to clients
type MazeData struct {
	Width  int      `json:"width"`
	Height int      `json:"height"`
	Cells  [][]Cell `json:"cells"`
}

// Cell represents a maze cell
type Cell struct {
	X      int  `json:"x"`
	Y      int  `json:"y"`
	Top    bool `json:"top"`
	Right  bool `json:"right"`
	Bottom bool `json:"bottom"`
	Left   bool `json:"left"`
}
