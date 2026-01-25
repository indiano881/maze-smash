package game

import (
	"fmt"
	"math/rand"
)

// Cell represents a single cell in the maze
type Cell struct {
	X       int  `json:"x"`
	Y       int  `json:"y"`
	Top     bool `json:"top"`
	Right   bool `json:"right"`
	Bottom  bool `json:"bottom"`
	Left    bool `json:"left"`
	Visited bool `json:"-"` // Don't send to client
}

// Maze represents the game maze
type Maze struct {
	Width  int      `json:"width"`
	Height int      `json:"height"`
	Cells  [][]Cell `json:"cells"`
}

// NewMaze generates a new maze using recursive backtracking
func NewMaze(width, height int) *Maze {
	// Note: rand is auto-seeded in Go 1.20+

	// Initialize grid with all walls
	cells := make([][]Cell, height)
	for y := 0; y < height; y++ {
		cells[y] = make([]Cell, width)
		for x := 0; x < width; x++ {
			cells[y][x] = Cell{
				X:       x,
				Y:       y,
				Top:     true,
				Right:   true,
				Bottom:  true,
				Left:    true,
				Visited: false,
			}
		}
	}

	maze := &Maze{
		Width:  width,
		Height: height,
		Cells:  cells,
	}

	// Generate maze using recursive backtracking
	maze.generate()

	// Debug: print cell (0,0) walls
	c := maze.Cells[0][0]
	fmt.Printf("Cell (0,0) walls - Top:%v Right:%v Bottom:%v Left:%v\n", c.Top, c.Right, c.Bottom, c.Left)

	return maze
}

func (m *Maze) generate() {
	stack := []struct{ x, y int }{{0, 0}}
	m.Cells[0][0].Visited = true

	iterations := 0
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		neighbors := m.getUnvisitedNeighbors(current.x, current.y)

		if len(neighbors) == 0 {
			stack = stack[:len(stack)-1] // Pop
		} else {
			// Pick random neighbor
			idx := rand.Intn(len(neighbors))
			next := neighbors[idx]

			if iterations < 5 {
				fmt.Printf("Iteration %d: current=(%d,%d) next=(%d,%d)\n",
					iterations, current.x, current.y, next.x, next.y)
			}

			m.removeWall(current.x, current.y, next.x, next.y)
			m.Cells[next.y][next.x].Visited = true
			stack = append(stack, next)
		}
		iterations++
	}
	fmt.Printf("Maze generated in %d iterations\n", iterations)
}

func (m *Maze) getUnvisitedNeighbors(x, y int) []struct{ x, y int } {
	var neighbors []struct{ x, y int }

	// Up
	if y > 0 && !m.Cells[y-1][x].Visited {
		neighbors = append(neighbors, struct{ x, y int }{x, y - 1})
	}
	// Right
	if x < m.Width-1 && !m.Cells[y][x+1].Visited {
		neighbors = append(neighbors, struct{ x, y int }{x + 1, y})
	}
	// Down
	if y < m.Height-1 && !m.Cells[y+1][x].Visited {
		neighbors = append(neighbors, struct{ x, y int }{x, y + 1})
	}
	// Left
	if x > 0 && !m.Cells[y][x-1].Visited {
		neighbors = append(neighbors, struct{ x, y int }{x - 1, y})
	}

	return neighbors
}

func (m *Maze) removeWall(x1, y1, x2, y2 int) {
	dx := x2 - x1
	dy := y2 - y1

	if dx == 1 {
		m.Cells[y1][x1].Right = false
		m.Cells[y2][x2].Left = false
	} else if dx == -1 {
		m.Cells[y1][x1].Left = false
		m.Cells[y2][x2].Right = false
	} else if dy == 1 {
		m.Cells[y1][x1].Bottom = false
		m.Cells[y2][x2].Top = false
	} else if dy == -1 {
		m.Cells[y1][x1].Top = false
		m.Cells[y2][x2].Bottom = false
	}
}

// CanMove checks if movement from one cell to another is valid
func (m *Maze) CanMove(fromX, fromY, toX, toY int) bool {
	if toX < 0 || toX >= m.Width || toY < 0 || toY >= m.Height {
		return false
	}

	cell := m.Cells[fromY][fromX]
	dx := toX - fromX
	dy := toY - fromY

	if dx == 1 {
		return !cell.Right
	}
	if dx == -1 {
		return !cell.Left
	}
	if dy == 1 {
		return !cell.Bottom
	}
	if dy == -1 {
		return !cell.Top
	}

	return false
}
