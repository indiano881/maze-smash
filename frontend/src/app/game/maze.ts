import { MazeData } from './services';

export interface Cell {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
}

export class Maze {
  cells: Cell[][] = [];
  width: number;
  height: number;

  constructor(width: number, height: number, serverData?: MazeData) {
    this.width = width;
    this.height = height;

    if (serverData) {
      this.loadFromServer(serverData);
    } else {
      this.generate();
    }
  }

  /**
   * Load maze from server data
   */
  private loadFromServer(data: MazeData): void {
    this.cells = [];
    for (let y = 0; y < data.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < data.width; x++) {
        const serverCell = data.cells[y][x];
        row.push({
          x: serverCell.x,
          y: serverCell.y,
          walls: {
            top: serverCell.top,
            right: serverCell.right,
            bottom: serverCell.bottom,
            left: serverCell.left,
          },
          visited: true, // Server maze is already generated
        });
      }
      this.cells.push(row);
    }
  }

  /**
   * Create maze from server data (static factory)
   */
  static fromServer(data: MazeData): Maze {
    return new Maze(data.width, data.height, data);
  }

  private generate(): void {
    // Initialize grid with all walls
    this.cells = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        });
      }
      this.cells.push(row);
    }

    // Recursive backtracking algorithm
    const stack: Cell[] = [];
    const startCell = this.cells[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.cells[y - 1][x].visited) {
      neighbors.push(this.cells[y - 1][x]);
    }
    if (x < this.width - 1 && !this.cells[y][x + 1].visited) {
      neighbors.push(this.cells[y][x + 1]);
    }
    if (y < this.height - 1 && !this.cells[y + 1][x].visited) {
      neighbors.push(this.cells[y + 1][x]);
    }
    if (x > 0 && !this.cells[y][x - 1].visited) {
      neighbors.push(this.cells[y][x - 1]);
    }

    return neighbors;
  }

  private removeWall(current: Cell, next: Cell): void {
    const dx = next.x - current.x;
    const dy = next.y - current.y;

    if (dx === 1) {
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      current.walls.left = false;
      next.walls.right = false;
    } else if (dy === 1) {
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  canMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
    if (toX < 0 || toX >= this.width || toY < 0 || toY >= this.height) {
      return false;
    }

    const current = this.cells[fromY][fromX];
    const dx = toX - fromX;
    const dy = toY - fromY;

    if (dx === 1) return !current.walls.right;
    if (dx === -1) return !current.walls.left;
    if (dy === 1) return !current.walls.bottom;
    if (dy === -1) return !current.walls.top;

    return false;
  }
}
