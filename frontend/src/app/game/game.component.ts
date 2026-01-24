import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { Application, Container, Graphics, Sprite, Assets } from 'pixi.js';
import { Maze } from './maze';
import { GameContext } from './game-context';
import { Player, Direction, Flag, Mole } from './entities';
import { HammerPickup, CloakPickup, BigTorchPickup, IceShardPickup } from './entities/pickups';
import { FogSystem, HUDSystem } from './systems';
import { MazeRenderer } from './rendering';

@Component({
  selector: 'app-game',
  standalone: true,
  template: `<div #gameContainer class="game-container"></div>`,
  styles: [
    `
      .game-container {
        border: 4px solid #2a1a0a;
        border-radius: 8px;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
        overflow: hidden;
      }
    `,
  ],
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  private app!: Application;
  private gameContainer!: Container;
  private backgroundSprite!: Sprite;
  private staticContainer!: Container;

  // Game context for passing to modules
  private context!: GameContext;

  // Systems
  private fogSystem!: FogSystem;
  private hudSystem!: HUDSystem;
  private mazeRenderer!: MazeRenderer;

  // Entities
  private player!: Player;
  private flag!: Flag;
  private mole!: Mole;
  private hammer!: HammerPickup;
  private cloak!: CloakPickup;
  private bigTorch!: BigTorchPickup;
  private iceShard!: IceShardPickup;

  // Game state
  private maze!: Maze;
  private exit = { x: 0, y: 0 };
  private invisibility = { active: false, endTime: 0 };
  private torchPower = { active: false, endTime: 0 };

  // Settings
  private readonly BASE_VISIBILITY = 5;
  private readonly TORCH_VISIBILITY = 10;
  private readonly MOVE_SPEED = 0.15;
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
    this.initContext();
    this.initSystems();
    this.initEntities();
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

    // Load and add background image
    const bgTexture = await Assets.load('assets/static/background.png');
    this.backgroundSprite = new Sprite(bgTexture);
    this.app.stage.addChild(this.backgroundSprite);

    this.gameContainer = new Container();
    this.gameContainer.sortableChildren = true;
    this.app.stage.addChild(this.gameContainer);

    // Static container for maze elements
    this.staticContainer = new Container();
    this.staticContainer.sortableChildren = true;
    this.gameContainer.addChild(this.staticContainer);
  }

  private initContext(): void {
    this.context = {
      staticContainer: this.staticContainer,
      toIso: this.toIso.bind(this),
      getDepth: this.getDepth.bind(this),
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      wallHeight: this.wallHeight,
      maze: this.maze,
      mazeWidth: this.MAZE_WIDTH,
      mazeHeight: this.MAZE_HEIGHT,
    };
  }

  private updateContext(): void {
    this.context.tileWidth = this.tileWidth;
    this.context.tileHeight = this.tileHeight;
    this.context.wallHeight = this.wallHeight;
    this.context.maze = this.maze;
  }

  private initSystems(): void {
    this.fogSystem = new FogSystem(
      this.context,
      this.gameContainer,
      this.BASE_VISIBILITY,
      this.TORCH_VISIBILITY
    );
    this.hudSystem = new HUDSystem(this.app.stage);
    this.mazeRenderer = new MazeRenderer(this.context);
  }

  private initEntities(): void {
    this.player = new Player(this.context);
    this.flag = new Flag(this.context);
    this.mole = new Mole(this.context);
    this.hammer = new HammerPickup(this.context);
    this.cloak = new CloakPickup(this.context);
    this.bigTorch = new BigTorchPickup(this.context);
    this.iceShard = new IceShardPickup(this.context);
  }

  private calculateSizes(): void {
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.75;

    const maxTileWidth = viewportWidth / (this.MAZE_WIDTH + this.MAZE_HEIGHT);
    const maxTileHeight = (viewportHeight - 100) / ((this.MAZE_WIDTH + this.MAZE_HEIGHT) / 2 + 1);

    this.tileWidth = Math.min(maxTileWidth * 1.5, maxTileHeight * 2, 120);
    this.tileHeight = this.tileWidth / 2;
    this.wallHeight = this.tileHeight * 0.4;

    const canvasWidth = (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileWidth / 2) + 100;
    const canvasHeight =
      (this.MAZE_WIDTH + this.MAZE_HEIGHT) * (this.tileHeight / 2) + this.wallHeight + 150;

    this.app.renderer.resize(canvasWidth, canvasHeight);

    if (this.backgroundSprite?.texture) {
      const scaleX = canvasWidth / this.backgroundSprite.texture.width;
      const scaleY = canvasHeight / this.backgroundSprite.texture.height;
      const scale = Math.max(scaleX, scaleY);
      this.backgroundSprite.scale.set(scale);
      this.backgroundSprite.x = (canvasWidth - this.backgroundSprite.texture.width * scale) / 2;
      this.backgroundSprite.y = (canvasHeight - this.backgroundSprite.texture.height * scale) / 2;
    }

    this.gameContainer.x = canvasWidth / 2;
    this.gameContainer.y = 80;
  }

  private onResize(): void {
    if (!this.initialized) return;
    this.calculateSizes();
    this.updateContext();
    this.player.draw();
    this.drawMaze();
    this.player.updatePosition();
  }

  private toIso(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - y) * (this.tileWidth / 2),
      y: (x + y) * (this.tileHeight / 2),
    };
  }

  private getDepth(
    x: number,
    y: number,
    layer: 'floor' | 'backWall' | 'sprite' | 'frontWall'
  ): number {
    const baseDepth = (x + y) * 100;
    switch (layer) {
      case 'floor':
        return baseDepth;
      case 'backWall':
        return baseDepth + 10;
      case 'sprite':
        return baseDepth + 50;
      case 'frontWall':
        return baseDepth + 90;
    }
  }

  private startAnimationLoop(): void {
    this.app.ticker.add(() => {
      // Update player animation
      this.player.updateAnimation(this.MOVE_SPEED);

      // Animate pickups
      this.hammer.animateSparkles();
      this.cloak.animateSparkles();
      this.bigTorch.animateSparkles();
      this.iceShard.animateSparkles();
      this.iceShard.updateProjectile();

      // Update invisibility
      this.updateInvisibility();

      // Update torch power
      this.updateTorchPower();

      // Update fog
      this.fogSystem.update(this.player.visualX, this.player.visualY, this.torchPower.active);

      // Update mole
      this.mole.update();
      this.mole.draw();
      this.mole.animateDirtParticles();
      this.checkMoleCollision();
    });
  }

  private updateInvisibility(): void {
    if (this.invisibility.active && Date.now() >= this.invisibility.endTime) {
      this.invisibility.active = false;
      this.player.draw();
      this.updateHUD();
    }

    if (this.invisibility.active) {
      this.updateHUD();
      const timeLeft = this.invisibility.endTime - Date.now();
      const pulse = 0.3 + Math.sin(Date.now() / 100) * 0.1;
      if (timeLeft < 2000) {
        this.player.setAlpha(0.3 + Math.sin(Date.now() / 50) * 0.3);
      } else {
        this.player.setAlpha(pulse);
      }
    } else {
      this.player.setAlpha(1);
    }
  }

  private updateTorchPower(): void {
    if (this.torchPower.active && Date.now() >= this.torchPower.endTime) {
      this.torchPower.active = false;
      this.updateHUD();
    }

    if (this.torchPower.active) {
      this.updateHUD();
    }
  }

  generateNewMaze(): void {
    this.maze = new Maze(this.MAZE_WIDTH, this.MAZE_HEIGHT);
    this.updateContext();
    this.exit = { x: this.MAZE_WIDTH - 1, y: this.MAZE_HEIGHT - 1 };

    // Reset player
    this.player.reset();

    // Place flag (not at exit or start)
    let flagX = Math.floor(Math.random() * (this.MAZE_WIDTH - 1)) + 1;
    let flagY = Math.floor(Math.random() * (this.MAZE_HEIGHT - 1)) + 1;
    if (flagX === this.exit.x && flagY === this.exit.y) {
      flagX = Math.max(0, this.exit.x - 1);
    }
    this.flag.reset(flagX, flagY);

    // Place pickups avoiding collisions
    const occupied = new Set<string>([
      `0,0`,
      `${this.exit.x},${this.exit.y}`,
      `${flagX},${flagY}`,
    ]);

    const placePickup = (
      pickup: { reset: (x: number, y: number) => void },
      occupied: Set<string>
    ) => {
      let x: number, y: number;
      do {
        x = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
        y = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
      } while (occupied.has(`${x},${y}`));
      occupied.add(`${x},${y}`);
      pickup.reset(x, y);
      return { x, y };
    };

    placePickup(this.hammer, occupied);
    placePickup(this.cloak, occupied);
    placePickup(this.bigTorch, occupied);
    placePickup(this.iceShard, occupied);

    // Place mole
    let moleX: number, moleY: number;
    do {
      moleX = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
      moleY = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
    } while (occupied.has(`${moleX},${moleY}`));
    this.mole.reset(moleX, moleY);

    // Reset power-ups
    this.invisibility = { active: false, endTime: 0 };
    this.torchPower = { active: false, endTime: 0 };

    this.drawMaze();
    this.updateHUD();
  }

  private drawMaze(): void {
    // Clear static container but preserve entity graphics
    const persistentGraphics = new Set<Graphics>([
      this.player.getGraphics(),
      this.flag.getGraphics(),
      this.hammer.getGraphics(),
      ...this.hammer.getSparkles(),
      this.cloak.getGraphics(),
      ...this.cloak.getSparkles(),
      this.bigTorch.getGraphics(),
      ...this.bigTorch.getSparkles(),
      this.iceShard.getGraphics(),
      ...this.iceShard.getSparkles(),
      this.iceShard.getProjectileGraphics(),
      this.mole.getGraphics(),
      this.mole.getDirtGraphics(),
      ...this.mole.getDirtParticles(),
    ]);

    while (this.staticContainer.children.length > 0) {
      const child = this.staticContainer.children[0];
      this.staticContainer.removeChild(child);
      if (!persistentGraphics.has(child as Graphics)) {
        child.destroy();
      }
    }

    // Draw maze floor, walls, exit
    this.mazeRenderer.drawMaze(this.exit);

    // Re-add entity graphics
    this.staticContainer.addChild(this.player.getGraphics());
    this.staticContainer.addChild(this.flag.getGraphics());
    this.staticContainer.addChild(this.hammer.getGraphics());
    this.hammer.getSparkles().forEach((s) => this.staticContainer.addChild(s));
    this.staticContainer.addChild(this.cloak.getGraphics());
    this.cloak.getSparkles().forEach((s) => this.staticContainer.addChild(s));
    this.staticContainer.addChild(this.bigTorch.getGraphics());
    this.bigTorch.getSparkles().forEach((s) => this.staticContainer.addChild(s));
    this.staticContainer.addChild(this.iceShard.getGraphics());
    this.iceShard.getSparkles().forEach((s) => this.staticContainer.addChild(s));
    this.staticContainer.addChild(this.iceShard.getProjectileGraphics());
    this.staticContainer.addChild(this.mole.getGraphics());
    this.staticContainer.addChild(this.mole.getDirtGraphics());
    this.mole.getDirtParticles().forEach((p) => this.staticContainer.addChild(p));

    // Draw all entities
    this.flag.draw();
    this.hammer.draw();
    this.cloak.draw();
    this.bigTorch.draw();
    this.iceShard.draw();
    this.mole.drawDirtMound();
    this.mole.draw();
  }

  private updateHUD(): void {
    this.hudSystem.update({
      hasHammer: this.player.hasHammer,
      hasIce: this.player.hasIce,
      invisibilityActive: this.invisibility.active,
      invisibilityEndTime: this.invisibility.endTime,
      torchActive: this.torchPower.active,
      torchEndTime: this.torchPower.endTime,
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.maze) return;

    let newX = this.player.x;
    let newY = this.player.y;
    let direction: Direction | null = null;

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        newY--;
        direction = 'up';
        break;
      case 's':
      case 'arrowdown':
        newY++;
        direction = 'down';
        break;
      case 'a':
      case 'arrowleft':
        newX--;
        direction = 'left';
        break;
      case 'd':
      case 'arrowright':
        newX++;
        direction = 'right';
        break;
      case 'e':
        event.preventDefault();
        this.trySmashWall();
        return;
      case 'q':
        event.preventDefault();
        this.shootIce();
        return;
      default:
        return;
    }

    event.preventDefault();

    if (direction && direction !== this.player.direction) {
      this.player.direction = direction;
      this.player.draw();
    }

    if (this.maze.canMove(this.player.x, this.player.y, newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
      this.checkPickups();
    }
  }

  private checkPickups(): void {
    // Check hammer
    if (!this.hammer.pickedUp && this.player.x === this.hammer.x && this.player.y === this.hammer.y) {
      this.hammer.pickedUp = true;
      this.player.hasHammer = true;
      this.hammer.updateVisibility();
      this.player.draw();
      this.updateHUD();
    }

    // Check cloak
    if (!this.cloak.pickedUp && this.player.x === this.cloak.x && this.player.y === this.cloak.y) {
      this.cloak.pickedUp = true;
      this.invisibility.active = true;
      this.invisibility.endTime = Date.now() + 10000;
      this.cloak.updateVisibility();
      this.player.draw();
      this.updateHUD();
    }

    // Check big torch
    if (
      !this.bigTorch.pickedUp &&
      this.player.x === this.bigTorch.x &&
      this.player.y === this.bigTorch.y
    ) {
      this.bigTorch.pickedUp = true;
      this.torchPower.active = true;
      this.torchPower.endTime = Date.now() + 10000;
      this.bigTorch.updateVisibility();
      this.updateHUD();
    }

    // Check ice shard
    if (
      !this.iceShard.pickedUp &&
      this.player.x === this.iceShard.x &&
      this.player.y === this.iceShard.y
    ) {
      this.iceShard.pickedUp = true;
      this.player.hasIce = true;
      this.iceShard.updateVisibility();
      this.updateHUD();
    }

    // Check flag
    if (!this.flag.captured && this.player.x === this.flag.x && this.player.y === this.flag.y) {
      this.flag.captured = true;
      this.flag.updateVisibility();
    }

    // Check win condition
    if (this.flag.captured && this.player.x === this.exit.x && this.player.y === this.exit.y) {
      setTimeout(() => {
        alert('You escaped with the flag! You win!');
        this.generateNewMaze();
      }, 100);
    }
  }

  private trySmashWall(): void {
    if (!this.player.hasHammer) return;

    const { x, y } = this.player;
    const cell = this.maze.cells[y]?.[x];
    if (!cell) return;

    let wallExists = false;
    let adjacentX = x;
    let adjacentY = y;
    let currentWallKey: 'top' | 'bottom' | 'left' | 'right';
    let adjacentWallKey: 'top' | 'bottom' | 'left' | 'right';

    switch (this.player.direction) {
      case 'up':
        wallExists = cell.walls.top;
        adjacentY = y - 1;
        currentWallKey = 'top';
        adjacentWallKey = 'bottom';
        break;
      case 'down':
        wallExists = cell.walls.bottom;
        adjacentY = y + 1;
        currentWallKey = 'bottom';
        adjacentWallKey = 'top';
        break;
      case 'left':
        wallExists = cell.walls.left;
        adjacentX = x - 1;
        currentWallKey = 'left';
        adjacentWallKey = 'right';
        break;
      case 'right':
        wallExists = cell.walls.right;
        adjacentX = x + 1;
        currentWallKey = 'right';
        adjacentWallKey = 'left';
        break;
    }

    if (!wallExists) return;

    if (
      adjacentX < 0 ||
      adjacentX >= this.MAZE_WIDTH ||
      adjacentY < 0 ||
      adjacentY >= this.MAZE_HEIGHT
    ) {
      return;
    }

    cell.walls[currentWallKey] = false;
    const adjacentCell = this.maze.cells[adjacentY]?.[adjacentX];
    if (adjacentCell) {
      adjacentCell.walls[adjacentWallKey] = false;
    }

    this.player.hasHammer = false;
    this.player.draw();
    this.drawMaze();
    this.player.updatePosition();
    this.updateHUD();
  }

  private shootIce(): void {
    if (!this.player.hasIce || this.iceShard.isProjectileActive()) return;

    this.player.hasIce = false;
    this.iceShard.shoot(this.player.x, this.player.y, this.player.direction);
    this.updateHUD();
  }

  private checkMoleCollision(): void {
    if (!this.mole.active) return;
    if (!this.mole.isSurfaced()) return;

    if (this.player.x === this.mole.x && this.player.y === this.mole.y) {
      // Player hit - reset to start
      this.player.x = 0;
      this.player.y = 0;
      this.player.visualX = 0;
      this.player.visualY = 0;
      this.player.zCellX = 0;
      this.player.zCellY = 0;

      // Flash effect
      this.player.setAlpha(0.2);
      setTimeout(() => this.player.setAlpha(1), 100);
      setTimeout(() => this.player.setAlpha(0.2), 200);
      setTimeout(() => this.player.setAlpha(1), 300);

      // Mole teleports
      this.mole.teleportRandom(this.player.x, this.player.y);
      this.player.updatePosition();
    }

    // Mole moves toward player when burrowing
    if (this.mole.burrowed) {
      return;
    }
    if (this.mole.burrowProgress >= 1) {
      this.mole.moveToward(this.player.x, this.player.y);
    }
  }
}
