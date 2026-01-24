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
  private maze!: Maze;
  private player = { x: 0, y: 0 };
  private playerVisual = { x: 0, y: 0 }; // Animated position
  private flag = { x: 0, y: 0, captured: false };
  private exit = { x: 0, y: 0 };
  private readonly MOVE_SPEED = 0.15; // Lerp factor (0-1, higher = faster)

  // Maze config
  private readonly MAZE_WIDTH = 5;
  private readonly MAZE_HEIGHT = 5;

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
    this.draw();
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
        this.draw();
      } else if (this.playerVisual.x !== this.player.x || this.playerVisual.y !== this.player.y) {
        // Snap to final position
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;
        this.draw();
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

    this.draw();
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
    }

    // Check win condition
    if (this.flag.captured && this.player.x === this.exit.x && this.player.y === this.exit.y) {
      setTimeout(() => {
        alert('You escaped with the flag! You win!');
        this.generateNewMaze();
      }, 100);
    }
  }

  private draw(): void {
    // Clear previous graphics
    this.gameContainer.removeChildren();

    // Draw floors first
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        this.drawFloor(x, y);
      }
    }

    // Draw walls and entities sorted by depth
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        this.drawWalls(x, y);

        // Draw exit
        if (this.exit.x === x && this.exit.y === y) {
          this.drawExit(x, y);
        }

        // Draw flag
        if (!this.flag.captured && this.flag.x === x && this.flag.y === y) {
          this.drawFlag(x, y);
        }
      }
    }

    // Draw player separately using visual position for smooth movement
    this.drawPlayer(this.playerVisual.x, this.playerVisual.y);
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
    this.gameContainer.addChild(floor);
  }

  private drawWalls(gridX: number, gridY: number): void {
    if (!this.maze?.cells?.[gridY]?.[gridX]) return;

    const cell = this.maze.cells[gridY][gridX];
    const { x, y } = this.toIso(gridX, gridY);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const wh = this.wallHeight;

    // Top wall (blocks Y-1 movement) - NE edge (from top corner to right corner)
    if (cell.walls.top === true) {
      const wall = new Graphics();
      const capRadius = wh * 0.4;
      // Front face with rounded ends
      wall.moveTo(capRadius * 0.5, -hh - capRadius * 0.25);
      wall.lineTo(hw - capRadius * 0.5, -capRadius * 0.25);
      wall.quadraticCurveTo(hw + capRadius * 0.3, -wh * 0.5, hw - capRadius * 0.5, -wh + capRadius * 0.25);
      wall.lineTo(capRadius * 0.5, -hh - wh + capRadius * 0.25);
      wall.quadraticCurveTo(-capRadius * 0.3, -hh - wh * 0.5, capRadius * 0.5, -hh - capRadius * 0.25);
      wall.fill({ color: 0x4a4a4a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = this.getDepth(gridX, gridY, 'frontWall');
      this.gameContainer.addChild(wall);
    }

    // Left wall (blocks X-1 movement) - NW edge (from left corner to top corner)
    if (cell.walls.left) {
      const wall = new Graphics();
      const capRadius = wh * 0.4;
      // Front face with rounded ends
      wall.moveTo(-hw + capRadius * 0.5, -capRadius * 0.25);
      wall.lineTo(-capRadius * 0.5, -hh - capRadius * 0.25);
      wall.quadraticCurveTo(capRadius * 0.3, -hh - wh * 0.5, -capRadius * 0.5, -hh - wh + capRadius * 0.25);
      wall.lineTo(-hw + capRadius * 0.5, -wh + capRadius * 0.25);
      wall.quadraticCurveTo(-hw - capRadius * 0.3, -wh * 0.5, -hw + capRadius * 0.5, -capRadius * 0.25);
      wall.fill({ color: 0x5a5a5a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = this.getDepth(gridX, gridY, 'backWall');
      this.gameContainer.addChild(wall);
    }

    // Bottom wall (blocks Y+1 movement) - SW edge (from left corner to bottom corner)
    if (cell.walls.bottom) {
      const wall = new Graphics();
      const capRadius = wh * 0.4;
      // Front face with rounded ends
      wall.moveTo(-hw + capRadius * 0.5, -capRadius * 0.25);
      wall.lineTo(-capRadius * 0.5, hh - capRadius * 0.25);
      wall.quadraticCurveTo(capRadius * 0.3, hh - wh * 0.5, -capRadius * 0.5, hh - wh + capRadius * 0.25);
      wall.lineTo(-hw + capRadius * 0.5, -wh + capRadius * 0.25);
      wall.quadraticCurveTo(-hw - capRadius * 0.3, -wh * 0.5, -hw + capRadius * 0.5, -capRadius * 0.25);
      wall.fill({ color: 0x4a4a4a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = this.getDepth(gridX, gridY, 'backWall');
      this.gameContainer.addChild(wall);
    }

    // Right wall (blocks X+1 movement) - SE edge (from bottom corner to right corner)
    if (cell.walls.right) {
      const wall = new Graphics();
      const capRadius = wh * 0.4;
      // Front face with rounded ends
      wall.moveTo(capRadius * 0.5, hh - capRadius * 0.25);
      wall.lineTo(hw - capRadius * 0.5, -capRadius * 0.25);
      wall.quadraticCurveTo(hw + capRadius * 0.3, -wh * 0.5, hw - capRadius * 0.5, -wh + capRadius * 0.25);
      wall.lineTo(capRadius * 0.5, hh - wh + capRadius * 0.25);
      wall.quadraticCurveTo(-capRadius * 0.3, hh - wh * 0.5, capRadius * 0.5, hh - capRadius * 0.25);
      wall.fill({ color: 0x5a5a5a });
      wall.x = x;
      wall.y = y;
      wall.zIndex = this.getDepth(gridX, gridY, 'frontWall');
      this.gameContainer.addChild(wall);
    }

    // Corner connectors - rounded pillars where walls meet
    // z-index based on corner's actual isometric position for proper depth sorting with player
    const pillarRadius = wh * 0.35;

    // Top corner (where top wall meets left wall) - behind the cell center
    if (cell.walls.top || cell.walls.left) {
      const corner = new Graphics();
      corner.ellipse(0, -hh, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.rect(-pillarRadius, -hh, pillarRadius * 2, -wh + pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.ellipse(0, -hh - wh + pillarRadius * 0.5, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY - 1) * 100 + 50;
      this.gameContainer.addChild(corner);
    }

    // Right corner (where top wall meets right wall) - same depth as cell
    if (cell.walls.top || cell.walls.right) {
      const corner = new Graphics();
      corner.ellipse(hw, 0, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.rect(hw - pillarRadius, 0, pillarRadius * 2, -wh + pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.ellipse(hw, -wh + pillarRadius * 0.5, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 50;
      this.gameContainer.addChild(corner);
    }

    // Left corner (where left wall meets bottom wall) - same depth as cell
    if (cell.walls.left || cell.walls.bottom) {
      const corner = new Graphics();
      corner.ellipse(-hw, 0, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.rect(-hw - pillarRadius, 0, pillarRadius * 2, -wh + pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.ellipse(-hw, -wh + pillarRadius * 0.5, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 50;
      this.gameContainer.addChild(corner);
    }

    // Bottom corner (where bottom wall meets right wall) - in front of the cell center
    if (cell.walls.bottom || cell.walls.right) {
      const corner = new Graphics();
      corner.ellipse(0, hh, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.rect(-pillarRadius, hh, pillarRadius * 2, -wh + pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.ellipse(0, hh - wh + pillarRadius * 0.5, pillarRadius, pillarRadius * 0.5);
      corner.fill({ color: 0x5a5a5a });
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY + 1) * 100 + 50;
      this.gameContainer.addChild(corner);
    }
  }

  private drawPlayer(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const scale = this.tileWidth / 80;

    const player = new Graphics();

    // Shadow
    player.ellipse(0, 5 * scale, 15 * scale, 8 * scale);
    player.fill({ color: 0x000000, alpha: 0.3 });

    // Body
    player.ellipse(0, -10 * scale, 12 * scale, 16 * scale);
    player.fill({ color: 0x2d5a27 });

    // Head
    player.circle(0, -30 * scale, 10 * scale);
    player.fill({ color: 0xe8c39e });

    // Torch (rounded handle)
    player.roundRect(12 * scale, -35 * scale, 4 * scale, 20 * scale, 2 * scale);
    player.fill({ color: 0x8b4513 });

    // Flame
    player.ellipse(14 * scale, -42 * scale, 6 * scale, 10 * scale);
    player.fill({ color: 0xff6600 });
    player.ellipse(14 * scale, -44 * scale, 4 * scale, 7 * scale);
    player.fill({ color: 0xffaa00 });

    player.x = x;
    player.y = y;
    player.zIndex = this.getDepth(gridX, gridY, 'sprite');
    this.gameContainer.addChild(player);
  }

  private drawFlag(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const scale = this.tileWidth / 80;

    const flag = new Graphics();

    // Glow
    flag.circle(0, 0, 25 * scale);
    flag.fill({ color: 0xffd700, alpha: 0.2 });

    // Pole (rounded with caps)
    flag.roundRect(-2 * scale, -40 * scale, 4 * scale, 45 * scale, 2 * scale);
    flag.fill({ color: 0x8b4513 });
    // Pole cap (ornament at top)
    flag.circle(0, -42 * scale, 3 * scale);
    flag.fill({ color: 0xdaa520 });

    // Flag cloth (wavy banner)
    flag.moveTo(2 * scale, -40 * scale);
    flag.quadraticCurveTo(15 * scale, -42 * scale, 25 * scale, -35 * scale);
    flag.quadraticCurveTo(22 * scale, -29 * scale, 27 * scale, -25 * scale);
    flag.quadraticCurveTo(22 * scale, -21 * scale, 25 * scale, -18 * scale);
    flag.quadraticCurveTo(15 * scale, -16 * scale, 2 * scale, -18 * scale);
    flag.lineTo(2 * scale, -40 * scale);
    flag.fill({ color: 0xcc0000 });

    flag.x = x;
    flag.y = y;
    flag.zIndex = this.getDepth(gridX, gridY, 'sprite');
    this.gameContainer.addChild(flag);
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
    this.gameContainer.addChild(exit);
  }
}
