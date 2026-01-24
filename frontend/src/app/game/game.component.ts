import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { Application, Container, Graphics } from 'pixi.js';
import { Maze } from './maze';

@Component({
  selector: 'app-game',
  standalone: true,
  template: `<div #gameContainer class="game-container"></div>`,
  styles: [`
    .game-container {
      border: 4px solid #2a1a0a;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
      overflow: hidden;
    }
  `],
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  private app!: Application;
  private gameContainer!: Container;
  private staticContainer!: Container; // Floor, walls, exit - only redraws on maze change
  private playerGraphics!: Graphics;   // Player sprite - just moves, no recreate
  private flagGraphics!: Graphics;     // Flag sprite
  private maze!: Maze;
  private player = { x: 0, y: 0 };
  private playerVisual = { x: 0, y: 0 }; // Animated position
  private flag = { x: 0, y: 0, captured: false };
  private exit = { x: 0, y: 0 };
  private readonly MOVE_SPEED = 0.15; // Lerp factor (0-1, higher = faster)

  // Maze config
  private readonly MAZE_WIDTH = 10;
  private readonly MAZE_HEIGHT = 10;

  // Tile sizes
  private tileWidth = 80;
  private tileHeight = 40;
  private wallHeight = 30;

  private boundNewMazeHandler = this.generateNewMaze.bind(this);
  private boundResizeHandler = this.onResize.bind(this);
  private initialized = false;

  ngOnInit(): void {
    window.addEventListener('newMaze', this.boundNewMazeHandler);
    window.addEventListener('resize', this.boundResizeHandler);
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initPixi();
    this.calculateSizes();
    this.generateNewMaze();
    this.startAnimationLoop();
    this.initialized = true;
  }

  ngOnDestroy(): void {
    window.removeEventListener('newMaze', this.boundNewMazeHandler);
    window.removeEventListener('resize', this.boundResizeHandler);
    this.app?.destroy(true);
  }

  private async initPixi(): Promise<void> {
    this.app = new Application();

    await this.app.init({
      background: '#000000',
      resizeTo: undefined,
      antialias: true,
    });

    this.containerRef.nativeElement.appendChild(this.app.canvas);

    this.gameContainer = new Container();
    this.gameContainer.sortableChildren = true;
    this.app.stage.addChild(this.gameContainer);

    // Static container for maze elements (redraws only on maze change)
    this.staticContainer = new Container();
    this.staticContainer.sortableChildren = true;
    this.gameContainer.addChild(this.staticContainer);

    // Player graphics (just update position, don't recreate)
    this.playerGraphics = new Graphics();
    this.gameContainer.addChild(this.playerGraphics);

    // Flag graphics
    this.flagGraphics = new Graphics();
    this.gameContainer.addChild(this.flagGraphics);
  }

  private calculateSizes(): void {
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.75;

    // Calculate tile size to fit viewport
    const maxTileWidth = viewportWidth / (this.MAZE_WIDTH + this.MAZE_HEIGHT);
    const maxTileHeight = (viewportHeight - 100) / ((this.MAZE_WIDTH + this.MAZE_HEIGHT) / 2 + 1);

    this.tileWidth = Math.min(maxTileWidth * 1.5, maxTileHeight * 2, 120);
    this.tileHeight = this.tileWidth / 2;
    this.wallHeight = this.tileHeight * 0.4;

    // Resize canvas
    const canvasWidth = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileWidth / 2) + 100;
    const canvasHeight = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileHeight / 2) + this.wallHeight + 150;

    this.app.renderer.resize(canvasWidth, canvasHeight);

    // Center the game container
    this.gameContainer.x = canvasWidth / 2;
    this.gameContainer.y = 80;
  }

  private onResize(): void {
    if (!this.initialized) return;
    this.calculateSizes();
    this.initPlayerGraphics();
    this.drawMaze();
    this.updatePlayerPosition();
  }

  // Convert grid to isometric screen coordinates
  private toIso(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - y) * (this.tileWidth / 2),
      y: (x + y) * (this.tileHeight / 2),
    };
  }

  // Calculate z-index for depth sorting
  // Higher depth = closer to camera = drawn later (in front)
  private getDepth(x: number, y: number, layer: 'floor' | 'backWall' | 'sprite' | 'frontWall'): number {
    const baseDepth = (x + y) * 100;
    switch (layer) {
      case 'floor': return baseDepth;
      case 'backWall': return baseDepth + 10;
      case 'sprite': return baseDepth + 50;
      case 'frontWall': return baseDepth + 90;
    }
  }

  private startAnimationLoop(): void {
    this.app.ticker.add(() => {
      // Lerp visual position toward target grid position
      const dx = this.player.x - this.playerVisual.x;
      const dy = this.player.y - this.playerVisual.y;

      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        this.playerVisual.x += dx * this.MOVE_SPEED;
        this.playerVisual.y += dy * this.MOVE_SPEED;
        this.updatePlayerPosition();
      } else if (this.playerVisual.x !== this.player.x || this.playerVisual.y !== this.player.y) {
        // Snap to final position
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;
        this.updatePlayerPosition();
      }
    });
  }

  generateNewMaze(): void {
    this.maze = new Maze(this.MAZE_WIDTH, this.MAZE_HEIGHT);
    this.player = { x: 0, y: 0 };
    this.playerVisual = { x: 0, y: 0 };
    this.flag = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 1)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 1)) + 1,
      captured: false
    };
    this.exit = { x: this.MAZE_WIDTH - 1, y: this.MAZE_HEIGHT - 1 };

    // Ensure flag isn't at exit
    if (this.flag.x === this.exit.x && this.flag.y === this.exit.y) {
      this.flag.x = Math.max(0, this.exit.x - 1);
    }

    this.initPlayerGraphics();
    this.drawMaze();
    this.updatePlayerPosition();
    this.updateFlagVisibility();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.maze) return;

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

    event.preventDefault();

    if (this.maze.canMove(this.player.x, this.player.y, newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
      this.checkPickups();
    }
  }

  private checkPickups(): void {
    // Check flag pickup
    if (!this.flag.captured && this.player.x === this.flag.x && this.player.y === this.flag.y) {
      this.flag.captured = true;
      this.updateFlagVisibility();
    }

    // Check win condition
    if (this.flag.captured && this.player.x === this.exit.x && this.player.y === this.exit.y) {
      setTimeout(() => {
        alert('You escaped with the flag! You win!');
        this.generateNewMaze();
      }, 100);
    }
  }

  // Draw static maze elements (only called on maze change)
  private drawMaze(): void {
    // Clear static container
    while (this.staticContainer.children.length > 0) {
      const child = this.staticContainer.children[0];
      this.staticContainer.removeChild(child);
      child.destroy();
    }

    // Draw floors first
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        this.drawFloor(x, y);
      }
    }

    // Draw walls and exit
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        this.drawWalls(x, y);

        // Draw exit
        if (this.exit.x === x && this.exit.y === y) {
          this.drawExit(x, y);
        }
      }
    }

    // Draw flag
    this.drawFlagGraphics();
  }

  // Update player position (called every animation frame - no object recreation)
  private updatePlayerPosition(): void {
    const { x, y } = this.toIso(this.playerVisual.x, this.playerVisual.y);
    this.playerGraphics.x = x;
    this.playerGraphics.y = y;
    this.playerGraphics.zIndex = (this.playerVisual.x + this.playerVisual.y) * 100 + 50;
  }

  // Update flag visibility
  private updateFlagVisibility(): void {
    this.flagGraphics.visible = !this.flag.captured;
  }

  // Draw flag graphics (only on maze change)
  private drawFlagGraphics(): void {
    const { x, y } = this.toIso(this.flag.x, this.flag.y);
    const scale = this.tileWidth / 80;

    this.flagGraphics.clear();

    // Glow
    this.flagGraphics.circle(0, 0, 25 * scale);
    this.flagGraphics.fill({ color: 0xffd700, alpha: 0.2 });

    // Pole (rounded with caps)
    this.flagGraphics.roundRect(-2 * scale, -40 * scale, 4 * scale, 45 * scale, 2 * scale);
    this.flagGraphics.fill({ color: 0x8b4513 });
    // Pole cap (ornament at top)
    this.flagGraphics.circle(0, -42 * scale, 3 * scale);
    this.flagGraphics.fill({ color: 0xdaa520 });

    // Flag cloth (wavy banner)
    this.flagGraphics.moveTo(2 * scale, -40 * scale);
    this.flagGraphics.quadraticCurveTo(15 * scale, -42 * scale, 25 * scale, -35 * scale);
    this.flagGraphics.quadraticCurveTo(22 * scale, -29 * scale, 27 * scale, -25 * scale);
    this.flagGraphics.quadraticCurveTo(22 * scale, -21 * scale, 25 * scale, -18 * scale);
    this.flagGraphics.quadraticCurveTo(15 * scale, -16 * scale, 2 * scale, -18 * scale);
    this.flagGraphics.lineTo(2 * scale, -40 * scale);
    this.flagGraphics.fill({ color: 0xcc0000 });

    this.flagGraphics.x = x;
    this.flagGraphics.y = y;
    this.flagGraphics.zIndex = (this.flag.x + this.flag.y) * 100 + 50;
    this.flagGraphics.visible = !this.flag.captured;
  }

  // Create player graphics (only once)
  private initPlayerGraphics(): void {
    const scale = this.tileWidth / 80;

    this.playerGraphics.clear();

    // Shadow
    this.playerGraphics.ellipse(0, 5 * scale, 15 * scale, 8 * scale);
    this.playerGraphics.fill({ color: 0x000000, alpha: 0.3 });

    // Body
    this.playerGraphics.ellipse(0, -10 * scale, 12 * scale, 16 * scale);
    this.playerGraphics.fill({ color: 0x2d5a27 });

    // Head
    this.playerGraphics.circle(0, -30 * scale, 10 * scale);
    this.playerGraphics.fill({ color: 0xe8c39e });

    // Torch (rounded handle)
    this.playerGraphics.roundRect(12 * scale, -35 * scale, 4 * scale, 20 * scale, 2 * scale);
    this.playerGraphics.fill({ color: 0x8b4513 });

    // Flame
    this.playerGraphics.ellipse(14 * scale, -42 * scale, 6 * scale, 10 * scale);
    this.playerGraphics.fill({ color: 0xff6600 });
    this.playerGraphics.ellipse(14 * scale, -44 * scale, 4 * scale, 7 * scale);
    this.playerGraphics.fill({ color: 0xffaa00 });
  }

  private drawFloor(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    const floor = new Graphics();
    floor.poly([
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ]);
    floor.fill({ color: 0x1a1a1a });
    floor.stroke({ color: 0x2a2a2a, width: 1 });

    floor.x = x;
    floor.y = y;
    floor.zIndex = this.getDepth(gridX, gridY, 'floor');
    this.staticContainer.addChild(floor);
  }

  private drawWalls(gridX: number, gridY: number): void {
    if (!this.maze?.cells?.[gridY]?.[gridX]) return;

    const cell = this.maze.cells[gridY][gridX];
    const { x, y } = this.toIso(gridX, gridY);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const wh = this.wallHeight;

    // Top wall (blocks Y-1 movement) - NE edge - at back of cell
    // Edge: from (0, -hh) to (hw, 0)
    if (cell.walls.top === true) {
      const wall = new Graphics();
      // Base aligned with grid, rounded top
      wall.moveTo(0, -hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, -hh / 2 - wh - 4, 0, -hh - wh);
      wall.closePath();
      wall.fill({ color: 0x4a4a4a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 25;
      this.staticContainer.addChild(wall);
    }

    // Left wall (blocks X-1 movement) - NW edge - at back of cell
    // Edge: from (-hw, 0) to (0, -hh)
    if (cell.walls.left) {
      const wall = new Graphics();
      wall.moveTo(-hw, 0);
      wall.lineTo(0, -hh);
      wall.lineTo(0, -hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, -hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: 0x5a5a5a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 25;
      this.staticContainer.addChild(wall);
    }

    // Bottom wall (blocks Y+1 movement) - SW edge - at front of cell
    // Edge: from (-hw, 0) to (0, hh)
    if (cell.walls.bottom) {
      const wall = new Graphics();
      wall.moveTo(-hw, 0);
      wall.lineTo(0, hh);
      wall.lineTo(0, hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: 0x4a4a4a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 + 75;
      this.staticContainer.addChild(wall);
    }

    // Right wall (blocks X+1 movement) - SE edge - at front of cell
    // Edge: from (0, hh) to (hw, 0)
    if (cell.walls.right) {
      const wall = new Graphics();
      wall.moveTo(0, hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, hh / 2 - wh - 4, 0, hh - wh);
      wall.closePath();
      wall.fill({ color: 0x5a5a5a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 + 75;
      this.staticContainer.addChild(wall);
    }

    // Corner connectors - cute rounded bubble pillars at grid corners
    const pr = wh * 0.5; // pillar radius (slightly bigger)

    // Helper to draw a cute pillar at position (px, py)
    const drawCutePillar = (corner: Graphics, px: number, py: number) => {
      // Base bubble
      corner.circle(px, py, pr * 0.8);
      corner.fill({ color: 0x5a5a5a });
      // Body (tapers up)
      corner.moveTo(px - pr * 0.7, py);
      corner.quadraticCurveTo(px - pr * 0.5, py - wh * 0.5, px - pr * 0.6, py - wh);
      corner.lineTo(px + pr * 0.6, py - wh);
      corner.quadraticCurveTo(px + pr * 0.5, py - wh * 0.5, px + pr * 0.7, py);
      corner.closePath();
      corner.fill({ color: 0x5a5a5a });
      // Cute dome top
      corner.ellipse(px, py - wh, pr * 0.7, pr * 0.5);
      corner.fill({ color: 0x6a6a6a });
      corner.circle(px, py - wh - pr * 0.3, pr * 0.5);
      corner.fill({ color: 0x6a6a6a });
      // Highlight dot
      corner.circle(px - pr * 0.2, py - wh - pr * 0.4, pr * 0.15);
      corner.fill({ color: 0x8a8a8a });
    };

    // Top corner (0, -hh)
    if (cell.walls.top || cell.walls.left) {
      const corner = new Graphics();
      drawCutePillar(corner, 0, -hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY - 1) * 100 + 50;
      this.staticContainer.addChild(corner);
    }

    // Right corner (hw, 0)
    if (cell.walls.top || cell.walls.right) {
      const corner = new Graphics();
      drawCutePillar(corner, hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 50;
      this.staticContainer.addChild(corner);
    }

    // Left corner (-hw, 0)
    if (cell.walls.left || cell.walls.bottom) {
      const corner = new Graphics();
      drawCutePillar(corner, -hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 50;
      this.staticContainer.addChild(corner);
    }

    // Bottom corner (0, hh)
    if (cell.walls.bottom || cell.walls.right) {
      const corner = new Graphics();
      drawCutePillar(corner, 0, hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY + 1) * 100 + 50;
      this.staticContainer.addChild(corner);
    }
  }

  private drawExit(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const scale = this.tileWidth / 80;

    const exit = new Graphics();

    // Glow
    exit.circle(0, -20 * scale, 40 * scale);
    exit.fill({ color: 0xffd700, alpha: 0.3 });

    // Archway pillars (rounded columns)
    exit.roundRect(-20 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: 0x4a4a4a });
    // Left pillar cap
    exit.ellipse(-16 * scale, -55 * scale, 5 * scale, 3 * scale);
    exit.fill({ color: 0x6a6a6a });
    exit.roundRect(12 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: 0x4a4a4a });
    // Right pillar cap
    exit.ellipse(16 * scale, -55 * scale, 5 * scale, 3 * scale);
    exit.fill({ color: 0x6a6a6a });

    // Arch top (rounded)
    exit.arc(0, -55 * scale, 16 * scale, Math.PI, 0);
    exit.fill({ color: 0x4a4a4a });

    // Dark doorway (rounded)
    exit.roundRect(-12 * scale, -50 * scale, 24 * scale, 52 * scale, 6 * scale);
    exit.fill({ color: 0x0a0505 });

    // Light glow inside (rounded)
    exit.roundRect(-8 * scale, -45 * scale, 16 * scale, 45 * scale, 4 * scale);
    exit.fill({ color: 0xffd700, alpha: 0.15 });

    exit.x = x;
    exit.y = y;
    exit.zIndex = this.getDepth(gridX, gridY, 'sprite');
    this.staticContainer.addChild(exit);
  }
}
