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
  private player: Player = { x: 0, y: 0 };
  private flag = { x: 0, y: 0 };
  private exit = { x: 0, y: 0 };

  // Maze config
  private readonly MAZE_WIDTH = 9;
  private readonly MAZE_HEIGHT = 9;

  // Dynamic tile sizes (calculated based on viewport)
  private tileWidth = 70;
  private tileHeight = 35;
  private wallHeight = 25;
  private wallThickness = 8;
  private scale = 1;

  private boundNewMazeHandler = this.generateNewMaze.bind(this);
  private boundResizeHandler = this.onResize.bind(this);

  ngOnInit(): void {
    window.addEventListener('newMaze', this.boundNewMazeHandler);
    window.addEventListener('resize', this.boundResizeHandler);
  }

  ngAfterViewInit(): void {
    this.calculateSizes();
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.generateNewMaze();
  }

  ngOnDestroy(): void {
    window.removeEventListener('newMaze', this.boundNewMazeHandler);
    window.removeEventListener('resize', this.boundResizeHandler);
  }

  private calculateSizes(): void {
    const canvas = this.canvasRef.nativeElement;
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.8;

    // Calculate tile width based on 90% viewport width
    // Isometric width = (MAZE_WIDTH + MAZE_HEIGHT) * (tileWidth / 2)
    const baseTileWidth = (viewportWidth - 50) / ((this.MAZE_WIDTH + this.MAZE_HEIGHT) / 2);

    // Also check height constraint
    const baseTileHeight = baseTileWidth / 2;
    const neededHeight = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (baseTileHeight / 2) + 100;

    // Use the smaller scale to fit both dimensions
    if (neededHeight > viewportHeight) {
      this.tileHeight = (viewportHeight - 100) / ((this.MAZE_WIDTH + this.MAZE_HEIGHT) / 2);
      this.tileWidth = this.tileHeight * 2;
    } else {
      this.tileWidth = baseTileWidth;
      this.tileHeight = baseTileHeight;
    }

    // Scale other elements proportionally
    this.scale = this.tileWidth / 70; // 70 was the original tile width
    this.wallHeight = 25 * this.scale;
    this.wallThickness = 8 * this.scale;

    // Set canvas size
    canvas.width = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileWidth / 2) + 50;
    canvas.height = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileHeight / 2) + this.wallHeight + 100;
  }

  private onResize(): void {
    this.calculateSizes();
    if (this.maze) {
      this.draw();
    }
  }

  // Convert grid coordinates to isometric screen coordinates
  private toIso(x: number, y: number): { sx: number; sy: number } {
    const offsetX = this.ctx.canvas.width / 2;
    const offsetY = 60 * this.scale;
    return {
      sx: (x - y) * (this.tileWidth / 2) + offsetX,
      sy: (x + y) * (this.tileHeight / 2) + offsetY,
    };
  }

  generateNewMaze(): void {
    this.maze = new Maze(this.MAZE_WIDTH, this.MAZE_HEIGHT);

    this.player.x = 0;
    this.player.y = 0;

    do {
      this.flag.x = Math.floor(Math.random() * this.MAZE_WIDTH);
      this.flag.y = Math.floor(Math.random() * this.MAZE_HEIGHT);
    } while (
      (this.flag.x === 0 && this.flag.y === 0) ||
      (this.flag.x === this.MAZE_WIDTH - 1 && this.flag.y === this.MAZE_HEIGHT - 1)
    );

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

  private getVisibility(x: number, y: number): number {
    return 1; // Full visibility - no fog of war
  }

  private draw(): void {
    const ctx = this.ctx;

    // Clear with dark background
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw from back to front (top-left to bottom-right in grid)
    // This ensures proper overlapping of 3D elements
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const visibility = this.getVisibility(x, y);
        if (visibility > 0) {
          this.drawFloorTile(x, y, visibility);
        }
      }
    }

    // Draw walls, objects, and player in correct order
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const visibility = this.getVisibility(x, y);

        // Draw back walls first (top and left)
        if (visibility > 0) {
          this.drawBackWalls(x, y, visibility);
        }

        // Draw flag if at this position
        if (this.flag.x === x && this.flag.y === y) {
          this.drawFlag(x, y);
        }

        // Draw exit if at this position
        if (this.exit.x === x && this.exit.y === y) {
          this.drawExit(x, y);
        }

        // Draw player if at this position
        if (this.player.x === x && this.player.y === y) {
          this.drawPlayer(x, y);
        }

        // Draw front walls (bottom and right)
        if (visibility > 0) {
          this.drawFrontWalls(x, y, visibility);
        }
      }
    }

    // Draw torch light overlay
    this.drawTorchLight();
  }

  private drawFloorTile(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(x, y);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    ctx.globalAlpha = visibility;

    // Floor diamond
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();

    // Floor gradient
    const gradient = ctx.createLinearGradient(sx - hw, sy, sx + hw, sy);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(0.5, '#252525');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Floor tile lines
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private drawBackWalls(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const cell = this.maze.cells[y][x];

    ctx.globalAlpha = visibility;

    // Top wall (back-left in isometric view)
    if (cell.walls.top) {
      this.drawWall3D(x, y, 'top', visibility);
    }

    // Left wall (back-right in isometric view)
    if (cell.walls.left) {
      this.drawWall3D(x, y, 'left', visibility);
    }

    ctx.globalAlpha = 1;
  }

  private drawFrontWalls(x: number, y: number, visibility: number): void {
    const ctx = this.ctx;
    const cell = this.maze.cells[y][x];

    ctx.globalAlpha = visibility;

    // Bottom wall
    if (cell.walls.bottom) {
      this.drawWall3D(x, y, 'bottom', visibility);
    }

    // Right wall
    if (cell.walls.right) {
      this.drawWall3D(x, y, 'right', visibility);
    }

    ctx.globalAlpha = 1;
  }

  private drawWall3D(x: number, y: number, side: 'top' | 'bottom' | 'left' | 'right', visibility: number): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(x, y);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const wallH = this.wallHeight;
    const thick = this.wallThickness;

    // Colors for stone walls
    const stoneTop = `rgba(90, 90, 90, ${visibility})`;
    const stoneFront = `rgba(60, 60, 60, ${visibility})`;
    const stoneSide = `rgba(45, 45, 45, ${visibility})`;
    const stoneDark = `rgba(30, 30, 30, ${visibility})`;

    if (side === 'top') {
      // Wall runs along top edge (going right in iso view)
      const startX = sx - hw;
      const startY = sy - hh;

      // Front face of wall
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + hw, startY + hh / 2);
      ctx.lineTo(startX + hw, startY + hh / 2 + wallH);
      ctx.lineTo(startX, startY + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneFront;
      ctx.fill();
      this.addStoneTexture(ctx, startX, startY, hw, wallH, visibility);

      // Top face of wall
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + hw, startY + hh / 2);
      ctx.lineTo(startX + hw + thick, startY + hh / 2 - thick / 2);
      ctx.lineTo(startX + thick, startY - thick / 2);
      ctx.closePath();
      ctx.fillStyle = stoneTop;
      ctx.fill();

      // Right side face
      ctx.beginPath();
      ctx.moveTo(startX + hw, startY + hh / 2);
      ctx.lineTo(startX + hw + thick, startY + hh / 2 - thick / 2);
      ctx.lineTo(startX + hw + thick, startY + hh / 2 - thick / 2 + wallH);
      ctx.lineTo(startX + hw, startY + hh / 2 + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneSide;
      ctx.fill();
    }

    if (side === 'left') {
      // Wall runs along left edge (going down-left in iso view)
      const startX = sx - hw;
      const startY = sy - hh;

      // Front face of wall
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY + wallH);
      ctx.lineTo(startX - hw, startY + hh + wallH);
      ctx.lineTo(startX - hw, startY + hh);
      ctx.closePath();
      ctx.fillStyle = stoneSide;
      ctx.fill();

      // Right face (front)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - hw, startY + hh);
      ctx.lineTo(startX - hw, startY + hh + wallH);
      ctx.lineTo(startX, startY + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneFront;
      ctx.fill();
      this.addStoneTexture(ctx, startX - hw, startY + hh, hw, wallH, visibility);

      // Top face
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - hw, startY + hh);
      ctx.lineTo(startX - hw - thick, startY + hh - thick / 2);
      ctx.lineTo(startX - thick, startY - thick / 2);
      ctx.closePath();
      ctx.fillStyle = stoneTop;
      ctx.fill();
    }

    if (side === 'bottom') {
      // Wall runs along bottom edge
      const startX = sx;
      const startY = sy + hh;

      // Front face
      ctx.beginPath();
      ctx.moveTo(startX - hw, startY);
      ctx.lineTo(startX, startY + hh);
      ctx.lineTo(startX, startY + hh + wallH);
      ctx.lineTo(startX - hw, startY + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneFront;
      ctx.fill();
      this.addStoneTexture(ctx, startX - hw, startY, hw, wallH, visibility);

      // Top face
      ctx.beginPath();
      ctx.moveTo(startX - hw, startY);
      ctx.lineTo(startX, startY + hh);
      ctx.lineTo(startX - thick, startY + hh - thick / 2);
      ctx.lineTo(startX - hw - thick, startY - thick / 2);
      ctx.closePath();
      ctx.fillStyle = stoneTop;
      ctx.fill();

      // Right side
      ctx.beginPath();
      ctx.moveTo(startX, startY + hh);
      ctx.lineTo(startX - thick, startY + hh - thick / 2);
      ctx.lineTo(startX - thick, startY + hh - thick / 2 + wallH);
      ctx.lineTo(startX, startY + hh + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneSide;
      ctx.fill();
    }

    if (side === 'right') {
      // Wall runs along right edge
      const startX = sx + hw;
      const startY = sy;

      // Front face
      ctx.beginPath();
      ctx.moveTo(startX, startY - hh);
      ctx.lineTo(startX, startY - hh + wallH);
      ctx.lineTo(startX, startY + hh + wallH);
      ctx.lineTo(startX, startY + hh);
      ctx.closePath();
      ctx.fillStyle = stoneDark;
      ctx.fill();

      // Right face (visible)
      ctx.beginPath();
      ctx.moveTo(startX, startY - hh);
      ctx.lineTo(startX, startY + hh);
      ctx.lineTo(startX, startY + hh + wallH);
      ctx.lineTo(startX, startY - hh + wallH);
      ctx.closePath();
      ctx.fillStyle = stoneSide;
      ctx.fill();
      this.addStoneTexture(ctx, startX - hw / 2, startY, hw, wallH, visibility);

      // Top face
      ctx.beginPath();
      ctx.moveTo(startX, startY - hh);
      ctx.lineTo(startX, startY + hh);
      ctx.lineTo(startX + thick, startY + hh - thick / 2);
      ctx.lineTo(startX + thick, startY - hh - thick / 2);
      ctx.closePath();
      ctx.fillStyle = stoneTop;
      ctx.fill();
    }
  }

  private addStoneTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, visibility: number): void {
    const s = this.scale;
    // Add stone block lines
    ctx.strokeStyle = `rgba(20, 20, 20, ${visibility * 0.5})`;
    ctx.lineWidth = 1 * s;

    // Horizontal mortar lines
    for (let i = 6 * s; i < h; i += 8 * s) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + w, y + i);
      ctx.stroke();
    }

    // Some vertical lines for brick pattern
    ctx.strokeStyle = `rgba(20, 20, 20, ${visibility * 0.3})`;
    for (let i = 8 * s; i < w; i += 15 * s) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i, y + h);
      ctx.stroke();
    }
  }

  private drawTorchLight(): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(this.player.x, this.player.y);
    const radius = this.tileWidth * 2.5;

    const flicker = 0.9 + Math.random() * 0.1;

    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * flicker);
    gradient.addColorStop(0, 'rgba(255, 180, 80, 0.15)');
    gradient.addColorStop(0.4, 'rgba(255, 120, 40, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  private drawPlayer(x: number, y: number): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(x, y);
    const s = this.scale;

    // Shadow on floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 6 * s, 14 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = '#3d7a37';
    ctx.beginPath();
    ctx.ellipse(sx - 3 * s, sy - 9 * s, 7 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath();
    ctx.arc(sx, sy - 26 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#4a3728';
    ctx.beginPath();
    ctx.arc(sx, sy - 30 * s, 8 * s, Math.PI, 0);
    ctx.fill();

    // Torch stick
    ctx.fillStyle = '#8b4513';
    ctx.save();
    ctx.translate(sx + 16 * s, sy - 18 * s);
    ctx.rotate(-0.3);
    ctx.fillRect(-2 * s, -18 * s, 5 * s, 22 * s);
    ctx.restore();

    // Torch flame
    const flameX = sx + 18 * s;
    const flameY = sy - 40 * s;
    const flameGradient = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 14 * s);
    flameGradient.addColorStop(0, '#ffff88');
    flameGradient.addColorStop(0.3, '#ffaa00');
    flameGradient.addColorStop(0.7, '#ff4400');
    flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.ellipse(flameX, flameY, (8 + Math.random() * 3) * s, (14 + Math.random() * 4) * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flame glow
    const glowGradient = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 40 * s);
    glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(flameX, flameY, 40 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlag(x: number, y: number): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(x, y);
    const s = this.scale;

    // Glow on floor
    const glowGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 35 * s);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(sx, sy, 35 * s, 0, Math.PI * 2);
    ctx.fill();

    // Pedestal
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4 * s, 14 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.fillRect(sx - 10 * s, sy - 6 * s, 20 * s, 12 * s);

    // Pole
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6 * s);
    ctx.lineTo(sx, sy - 45 * s);
    ctx.stroke();

    // Flag cloth
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 45 * s);
    ctx.quadraticCurveTo(sx + 16 * s, sy - 38 * s, sx + 24 * s, sy - 35 * s);
    ctx.quadraticCurveTo(sx + 14 * s, sy - 28 * s, sx + 22 * s, sy - 22 * s);
    ctx.lineTo(sx, sy - 22 * s);
    ctx.closePath();
    ctx.fill();

    // Flag highlight
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 45 * s);
    ctx.quadraticCurveTo(sx + 10 * s, sy - 40 * s, sx + 16 * s, sy - 38 * s);
    ctx.lineTo(sx, sy - 35 * s);
    ctx.closePath();
    ctx.fill();
  }

  private drawExit(x: number, y: number): void {
    const ctx = this.ctx;
    const { sx, sy } = this.toIso(x, y);
    const s = this.scale;

    // Golden glow
    const glowGradient = ctx.createRadialGradient(sx, sy - 20 * s, 0, sx, sy - 20 * s, 55 * s);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.2)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(sx, sy - 20 * s, 55 * s, 0, Math.PI * 2);
    ctx.fill();

    // Stone archway - back
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(sx - 20 * s, sy - 55 * s, 10 * s, 60 * s);
    ctx.fillRect(sx + 10 * s, sy - 55 * s, 10 * s, 60 * s);

    // Arch top
    ctx.beginPath();
    ctx.arc(sx, sy - 55 * s, 20 * s, Math.PI, 0);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill();

    // Archway highlight
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(sx - 18 * s, sy - 52 * s, 4 * s, 54 * s);
    ctx.fillRect(sx + 14 * s, sy - 52 * s, 4 * s, 54 * s);

    // Dark opening
    ctx.fillStyle = '#0a0505';
    ctx.fillRect(sx - 11 * s, sy - 50 * s, 22 * s, 52 * s);

    // Light from doorway
    const doorGradient = ctx.createLinearGradient(sx - 11 * s, sy - 25 * s, sx + 11 * s, sy - 25 * s);
    doorGradient.addColorStop(0, 'rgba(255, 220, 150, 0.1)');
    doorGradient.addColorStop(0.5, 'rgba(255, 220, 150, 0.25)');
    doorGradient.addColorStop(1, 'rgba(255, 220, 150, 0.1)');
    ctx.fillStyle = doorGradient;
    ctx.fillRect(sx - 11 * s, sy - 50 * s, 22 * s, 52 * s);

    // Sparkles
    ctx.fillStyle = '#ffd700';
    [[sx - 4 * s, sy - 35 * s], [sx + 5 * s, sy - 20 * s], [sx, sy - 42 * s], [sx + 3 * s, sy - 10 * s]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, (2 + Math.random()) * s, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
