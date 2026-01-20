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
        border: 4px solid #2a1a0a;
        border-radius: 4px;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.5);
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
  private readonly CELL_SIZE = 40;
  private readonly WALL_THICKNESS = 8;

  // Fog of war
  private readonly VISION_RADIUS = 3;

  // Stone texture cache
  private stonePattern!: CanvasPattern | null;
  private floorPattern!: CanvasPattern | null;

  private boundNewMazeHandler = this.generateNewMaze.bind(this);

  ngOnInit(): void {
    window.addEventListener('newMaze', this.boundNewMazeHandler);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.MAZE_WIDTH * this.CELL_SIZE;
    canvas.height = this.MAZE_HEIGHT * this.CELL_SIZE;
    this.ctx = canvas.getContext('2d')!;

    this.createPatterns();
    this.generateNewMaze();
  }

  ngOnDestroy(): void {
    window.removeEventListener('newMaze', this.boundNewMazeHandler);
  }

  private createPatterns(): void {
    // Create stone wall texture
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 16;
    stoneCanvas.height = 16;
    const stoneCtx = stoneCanvas.getContext('2d')!;

    // Base stone color
    stoneCtx.fillStyle = '#4a4a4a';
    stoneCtx.fillRect(0, 0, 16, 16);

    // Add noise/grain for stone texture
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 16;
      const y = Math.random() * 16;
      const shade = Math.random() * 30 - 15;
      stoneCtx.fillStyle = `rgb(${74 + shade}, ${74 + shade}, ${74 + shade})`;
      stoneCtx.fillRect(x, y, 2, 2);
    }

    // Add mortar lines
    stoneCtx.strokeStyle = '#2a2a2a';
    stoneCtx.lineWidth = 1;
    stoneCtx.beginPath();
    stoneCtx.moveTo(0, 8);
    stoneCtx.lineTo(16, 8);
    stoneCtx.moveTo(8, 0);
    stoneCtx.lineTo(8, 8);
    stoneCtx.moveTo(0, 8);
    stoneCtx.lineTo(0, 16);
    stoneCtx.stroke();

    this.stonePattern = this.ctx.createPattern(stoneCanvas, 'repeat');

    // Create floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 20;
    floorCanvas.height = 20;
    const floorCtx = floorCanvas.getContext('2d')!;

    // Dark stone floor
    floorCtx.fillStyle = '#1a1a1a';
    floorCtx.fillRect(0, 0, 20, 20);

    // Add subtle cracks and variation
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 20;
      const y = Math.random() * 20;
      const shade = Math.random() * 20 - 10;
      floorCtx.fillStyle = `rgb(${26 + shade}, ${26 + shade}, ${28 + shade})`;
      floorCtx.fillRect(x, y, 3, 3);
    }

    // Grid lines for floor tiles
    floorCtx.strokeStyle = '#0a0a0a';
    floorCtx.lineWidth = 1;
    floorCtx.strokeRect(0, 0, 20, 20);

    this.floorPattern = this.ctx.createPattern(floorCanvas, 'repeat');
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
    if (this.player.x === this.flag.x && this.player.y === this.flag.y) {
      this.flag.x = -1;
      this.flag.y = -1;
    }

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

    // Clear with dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw floor and walls with fog of war
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const distance = Math.abs(x - this.player.x) + Math.abs(y - this.player.y);
        const isVisible = distance <= this.VISION_RADIUS;
        const visibility = isVisible
          ? 1 - (distance / (this.VISION_RADIUS + 1)) * 0.6
          : 0;

        if (visibility > 0) {
          this.drawFloor(x, y, visibility);
        }
      }
    }

    // Draw walls on top (second pass for proper layering)
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const distance = Math.abs(x - this.player.x) + Math.abs(y - this.player.y);
        const isVisible = distance <= this.VISION_RADIUS;
        const visibility = isVisible
          ? 1 - (distance / (this.VISION_RADIUS + 1)) * 0.6
          : 0;

        if (visibility > 0) {
          this.drawWalls(x, y, visibility);
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

    // Draw torch light effect
    this.drawTorchLight();

    // Draw player
    this.drawPlayer();
  }

  private drawFloor(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = x * cellSize;
    const py = y * cellSize;
    const wall = this.WALL_THICKNESS;

    // Draw floor tile
    ctx.globalAlpha = visibility;

    if (this.floorPattern) {
      ctx.fillStyle = this.floorPattern;
    } else {
      ctx.fillStyle = '#1a1a1a';
    }
    ctx.fillRect(px + wall/2, py + wall/2, cellSize - wall, cellSize - wall);

    ctx.globalAlpha = 1;
  }

  private drawWalls(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const cell = this.maze.cells[y][x];
    const px = x * cellSize;
    const py = y * cellSize;
    const wall = this.WALL_THICKNESS;

    ctx.globalAlpha = visibility;

    // Draw 3D stone walls
    if (cell.walls.top) {
      this.draw3DWall(px, py, cellSize, wall, 'horizontal', visibility);
    }
    if (cell.walls.bottom) {
      this.draw3DWall(px, py + cellSize - wall, cellSize, wall, 'horizontal', visibility);
    }
    if (cell.walls.left) {
      this.draw3DWall(px, py, wall, cellSize, 'vertical', visibility);
    }
    if (cell.walls.right) {
      this.draw3DWall(px + cellSize - wall, py, wall, cellSize, 'vertical', visibility);
    }

    ctx.globalAlpha = 1;
  }

  private draw3DWall(x: number, y: number, width: number, height: number, orientation: 'horizontal' | 'vertical', visibility: number): void {
    const ctx = this.ctx;
    const depth = 3;

    // Main wall face with stone pattern
    if (this.stonePattern) {
      ctx.fillStyle = this.stonePattern;
    } else {
      ctx.fillStyle = '#4a4a4a';
    }
    ctx.fillRect(x, y, width, height);

    // Top highlight (light from above)
    ctx.fillStyle = `rgba(120, 120, 120, ${visibility * 0.7})`;
    if (orientation === 'horizontal') {
      ctx.fillRect(x, y, width, depth);
    } else {
      ctx.fillRect(x, y, depth, height);
    }

    // Bottom/right shadow (3D depth)
    ctx.fillStyle = `rgba(0, 0, 0, ${visibility * 0.6})`;
    if (orientation === 'horizontal') {
      ctx.fillRect(x, y + height - depth, width, depth);
    } else {
      ctx.fillRect(x + width - depth, y, depth, height);
    }

    // Inner shadow for depth
    ctx.fillStyle = `rgba(0, 0, 0, ${visibility * 0.3})`;
    if (orientation === 'horizontal') {
      ctx.fillRect(x + depth, y + depth, width - depth * 2, height - depth * 2);
    } else {
      ctx.fillRect(x + depth, y + depth, width - depth * 2, height - depth * 2);
    }

    // Stone block lines
    ctx.strokeStyle = `rgba(30, 30, 30, ${visibility * 0.8})`;
    ctx.lineWidth = 1;

    if (orientation === 'horizontal' && width > 20) {
      for (let i = 10; i < width; i += 12) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
        ctx.stroke();
      }
    } else if (orientation === 'vertical' && height > 20) {
      for (let i = 10; i < height; i += 12) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + width, y + i);
        ctx.stroke();
      }
    }
  }

  private drawTorchLight(): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = this.player.x * cellSize + cellSize / 2;
    const py = this.player.y * cellSize + cellSize / 2;
    const radius = cellSize * this.VISION_RADIUS;

    // Flickering torch effect
    const flicker = 0.9 + Math.random() * 0.1;

    // Radial light gradient
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * flicker);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
    gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.08)');
    gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = this.player.x * cellSize + cellSize / 2;
    const py = this.player.y * cellSize + cellSize / 2;

    // Outer glow (torch light)
    const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, cellSize * 0.8);
    glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.2)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Player body (adventurer)
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();
    ctx.arc(px, py + 2, cellSize / 4, 0, Math.PI * 2);
    ctx.fill();

    // Player head
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath();
    ctx.arc(px, py - 4, cellSize / 6, 0, Math.PI * 2);
    ctx.fill();

    // Torch in hand
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(px + 6, py - 8, 3, 12);

    // Torch flame
    const flameGradient = ctx.createRadialGradient(px + 7, py - 12, 0, px + 7, py - 10, 6);
    flameGradient.addColorStop(0, '#ffff00');
    flameGradient.addColorStop(0.3, '#ffa500');
    flameGradient.addColorStop(1, '#ff4500');
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.ellipse(px + 7, py - 12, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlag(x: number, y: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;

    // Glowing pedestal
    const pedestalGradient = ctx.createRadialGradient(px, py + 8, 0, px, py + 8, 15);
    pedestalGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    pedestalGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = pedestalGradient;
    ctx.beginPath();
    ctx.arc(px, py + 8, 15, 0, Math.PI * 2);
    ctx.fill();

    // Stone pedestal
    ctx.fillStyle = '#555';
    ctx.fillRect(px - 8, py + 5, 16, 8);
    ctx.fillStyle = '#666';
    ctx.fillRect(px - 6, py + 3, 12, 4);

    // Flag pole
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py + 5);
    ctx.lineTo(px, py - 12);
    ctx.stroke();

    // Flag cloth with wave effect
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.quadraticCurveTo(px + 8, py - 10, px + 14, py - 8);
    ctx.quadraticCurveTo(px + 8, py - 6, px + 12, py - 2);
    ctx.lineTo(px, py - 2);
    ctx.closePath();
    ctx.fill();

    // Flag highlight
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.quadraticCurveTo(px + 5, py - 10, px + 10, py - 9);
    ctx.lineTo(px, py - 8);
    ctx.closePath();
    ctx.fill();
  }

  private drawExit(x: number, y: number): void {
    const ctx = this.ctx;
    const cellSize = this.CELL_SIZE;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;

    // Golden glow
    const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, cellSize * 0.7);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.2)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

    // Stone archway
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(px - 12, py - 14, 6, 28);
    ctx.fillRect(px + 6, py - 14, 6, 28);
    ctx.fillRect(px - 12, py - 16, 24, 6);

    // Arch highlight
    ctx.fillStyle = '#707070';
    ctx.fillRect(px - 10, py - 14, 2, 26);
    ctx.fillRect(px + 8, py - 14, 2, 26);
    ctx.fillRect(px - 10, py - 14, 20, 2);

    // Dark doorway
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(px - 6, py - 10, 12, 22);

    // Light coming through
    const doorGradient = ctx.createLinearGradient(px - 6, py, px + 6, py);
    doorGradient.addColorStop(0, 'rgba(255, 220, 150, 0.1)');
    doorGradient.addColorStop(0.5, 'rgba(255, 220, 150, 0.3)');
    doorGradient.addColorStop(1, 'rgba(255, 220, 150, 0.1)');
    ctx.fillStyle = doorGradient;
    ctx.fillRect(px - 6, py - 10, 12, 22);

    // Stars/sparkle effect
    ctx.fillStyle = '#ffd700';
    const sparkles = [[px - 2, py - 5], [px + 3, py], [px - 1, py + 5], [px + 2, py - 8]];
    sparkles.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
