import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { Maze } from './maze';

interface Player {
  x: number;
  y: number;
  color: string;
}

@Component({
  selector: 'app-game',
  standalone: true,
  template: `<canvas #gameCanvas></canvas>`,
  styles: [
    `
      canvas {
        border: 3px solid #4a4e69;
        border-radius: 8px;
        background: #16213e;
      }
    `,
  ],
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private maze!: Maze;
  private player: Player = { x: 0, y: 0, color: '#00ff88' };
  private flag = { x: 0, y: 0 };
  private exit = { x: 0, y: 0 };

  // Maze config
  private readonly MAZE_WIDTH = 15;
  private readonly MAZE_HEIGHT = 15;
  private readonly CELL_SIZE = 35;
  private readonly WALL_COLOR = '#4a4e69';
  private readonly FLOOR_COLOR = '#16213e';

  // Fog of war
  private readonly VISION_RADIUS = 3;

  private boundNewMazeHandler = this.generateNewMaze.bind(this);

  ngOnInit(): void {
    window.addEventListener('newMaze', this.boundNewMazeHandler);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.MAZE_WIDTH * this.CELL_SIZE;
    canvas.height = this.MAZE_HEIGHT * this.CELL_SIZE;
    this.ctx = canvas.getContext('2d')!;

    this.generateNewMaze();
  }

  ngOnDestroy(): void {
    window.removeEventListener('newMaze', this.boundNewMazeHandler);
  }

  generateNewMaze(): void {
    this.maze = new Maze(this.MAZE_WIDTH, this.MAZE_HEIGHT);

    // Player starts at top-left
    this.player.x = 0;
    this.player.y = 0;

    // Flag spawns randomly (not at player or exit)
    do {
      this.flag.x = Math.floor(Math.random() * this.MAZE_WIDTH);
      this.flag.y = Math.floor(Math.random() * this.MAZE_HEIGHT);
    } while (
      (this.flag.x === 0 && this.flag.y === 0) ||
      (this.flag.x === this.MAZE_WIDTH - 1 && this.flag.y === this.MAZE_HEIGHT - 1)
    );

    // Exit at bottom-right
    this.exit.x = this.MAZE_WIDTH - 1;
    this.exit.y = this.MAZE_HEIGHT - 1;

    this.draw();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    let newX = this.player.x;
    let newY = this.player.y;

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        newY--;
        break;
      case 's':
      case 'arrowdown':
        newY++;
        break;
      case 'a':
      case 'arrowleft':
        newX--;
        break;
      case 'd':
      case 'arrowright':
        newX++;
        break;
      default:
        return;
    }

    if (this.maze.canMove(this.player.x, this.player.y, newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
      this.draw();
      this.checkWinCondition();
    }
  }

  private checkWinCondition(): void {
    // Check if player reached the flag
    if (this.player.x === this.flag.x && this.player.y === this.flag.y) {
      // For now just move flag off screen to indicate capture
      this.flag.x = -1;
      this.flag.y = -1;
    }

    // Check if player reached exit with flag
    if (
      this.player.x === this.exit.x &&
      this.player.y === this.exit.y &&
      this.flag.x === -1
    ) {
      setTimeout(() => {
        alert('You escaped with the flag! You win!');
        this.generateNewMaze();
      }, 100);
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;

    // Clear canvas
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw maze cells with fog of war
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const distance = Math.abs(x - this.player.x) + Math.abs(y - this.player.y);
        const isVisible = distance <= this.VISION_RADIUS;
        const visibility = isVisible
          ? 1 - (distance / (this.VISION_RADIUS + 1)) * 0.5
          : 0;

        if (visibility > 0) {
          this.drawCell(x, y, visibility);
        }
      }
    }

    // Draw flag if visible and not captured
    if (this.flag.x >= 0) {
      const flagDist =
        Math.abs(this.flag.x - this.player.x) +
        Math.abs(this.flag.y - this.player.y);
      if (flagDist <= this.VISION_RADIUS) {
        this.drawFlag(this.flag.x, this.flag.y);
      }
    }

    // Draw exit if visible
    const exitDist =
      Math.abs(this.exit.x - this.player.x) +
      Math.abs(this.exit.y - this.player.y);
    if (exitDist <= this.VISION_RADIUS) {
      this.drawExit(this.exit.x, this.exit.y);
    }

    // Draw player
    this.drawPlayer();
  }

  private drawCell(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const cell = this.maze.cells[y][x];
    const px = x * cellSize;
    const py = y * cellSize;

    // Floor with visibility fade
    const floorBrightness = Math.floor(22 * visibility);
    ctx.fillStyle = `rgb(${floorBrightness}, ${Math.floor(33 * visibility)}, ${Math.floor(62 * visibility)})`;
    ctx.fillRect(px, py, cellSize, cellSize);

    // Walls
    const wallBrightness = Math.floor(74 * visibility);
    ctx.strokeStyle = `rgb(${wallBrightness}, ${Math.floor(78 * visibility)}, ${Math.floor(105 * visibility)})`;
    ctx.lineWidth = 3;

    if (cell.walls.top) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + cellSize, py);
      ctx.stroke();
    }
    if (cell.walls.right) {
      ctx.beginPath();
      ctx.moveTo(px + cellSize, py);
      ctx.lineTo(px + cellSize, py + cellSize);
      ctx.stroke();
    }
    if (cell.walls.bottom) {
      ctx.beginPath();
      ctx.moveTo(px, py + cellSize);
      ctx.lineTo(px + cellSize, py + cellSize);
      ctx.stroke();
    }
    if (cell.walls.left) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + cellSize);
      ctx.stroke();
    }
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = this.player.x * cellSize + cellSize / 2;
    const py = this.player.y * cellSize + cellSize / 2;

    // Glow effect
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, cellSize / 2);
    gradient.addColorStop(0, this.player.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(
      px - cellSize / 2,
      py - cellSize / 2,
      cellSize,
      cellSize
    );

    // Player circle
    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.arc(px, py, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px - 3, py - 3, cellSize / 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlag(x: number, y: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;

    // Flag pole
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 5, py + 10);
    ctx.lineTo(px - 5, py - 10);
    ctx.stroke();

    // Flag
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 10);
    ctx.lineTo(px + 10, py - 5);
    ctx.lineTo(px - 5, py);
    ctx.closePath();
    ctx.fill();
  }

  private drawExit(x: number, y: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;

    // Exit glow
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, cellSize / 2);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

    // Exit symbol (door)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(px - 8, py - 10, 16, 20);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(px - 5, py - 7, 10, 14);

    // Door handle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(px + 2, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
