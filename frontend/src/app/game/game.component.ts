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

// Garden Theme Colors
const GARDEN = {
  hedgeGreen: 0x4E7B15,
  hedgeDark: 0x3A5C10,
  hedgeLight: 0x5E9B1A,
  roseRed: 0xE31E24,
  roseDark: 0xB01820,
  marbleWhite: 0xF2F2F2,
  marbleVein: 0xD1D1D1,
  outline: 0x1A1A1A,
  outlineWidth: 2,
  shadowAlpha: 0.2,
  glowYellow: 0xFFFACD,
  // Gardener colors
  skinPeach: 0xFFDBAC,
  overallsBlue: 0x4A7CB0,
  overallsDark: 0x3A6090,
  strawHat: 0xE8D4A0,
  strawHatDark: 0xC8B480,
  wateringCan: 0x808080,
  wateringCanDark: 0x606060,
};

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
  private hudContainer!: Container;    // HUD overlay (fixed position)
  private hudFace!: Graphics;          // Character face circle
  private hudSlot1!: Graphics;         // Inventory slot 1 (hammer)
  private hudSlot2!: Graphics;         // Inventory slot 2 (cloak/invisibility)
  private hudSlot3!: Graphics;         // Inventory slot 3 (big torch)
  private hudSlot4!: Graphics;         // Inventory slot 4 (ice shard)
  private staticContainer!: Container; // Floor, walls, exit - only redraws on maze change
  private fogContainer!: Container;    // Fog of war overlay
  private playerGraphics!: Graphics;   // Player sprite - just moves, no recreate
  private flagGraphics!: Graphics;     // Flag sprite
  private hammerGraphics!: Graphics;   // Hammer pickup sprite
  private hammerSparkles: Graphics[] = []; // Animated magic sparkles
  private sparkleOffsets: number[] = [];   // Y offsets for each sparkle
  private cloakGraphics!: Graphics;    // Cloak pickup sprite
  private cloakSparkles: Graphics[] = []; // Cloak magic sparkles
  private cloakSparkleOffsets: number[] = []; // Y offsets for cloak sparkles
  private bigTorchGraphics!: Graphics; // Big torch pickup sprite
  private bigTorchSparkles: Graphics[] = []; // Big torch magic sparkles
  private bigTorchSparkleOffsets: number[] = []; // Y offsets for big torch sparkles
  private iceShardGraphics!: Graphics; // Ice shard pickup sprite
  private iceShardSparkles: Graphics[] = []; // Ice shard magic sparkles
  private iceShardSparkleOffsets: number[] = []; // Y offsets for ice shard sparkles
  private iceProjectileGraphics!: Graphics; // Ice projectile when shot
  private maze!: Maze;
  private player = { x: 0, y: 0, hasHammer: false, hasIce: false };
  private playerVisual = { x: 0, y: 0 }; // Animated position
  private playerZCell = { x: 0, y: 0 };  // Cell used for z-index (updates only when movement completes)
  private playerDirection: 'up' | 'down' | 'left' | 'right' = 'down'; // Last movement direction
  private flag = { x: 0, y: 0, captured: false };
  private hammer = { x: 0, y: 0, pickedUp: false };
  private cloak = { x: 0, y: 0, pickedUp: false };
  private invisibility = { active: false, endTime: 0 };
  private bigTorch = { x: 0, y: 0, pickedUp: false };
  private torchPower = { active: false, endTime: 0 };
  private iceShard = { x: 0, y: 0, pickedUp: false };
  private iceProjectile = {
    active: false,
    x: 0, y: 0,
    visualX: 0, visualY: 0,
    direction: 'down' as 'up' | 'down' | 'left' | 'right'
  };
  private exit = { x: 0, y: 0 };

  // Fog of war settings
  private readonly BASE_VISIBILITY = 5;     // Default view radius (tiles)
  private readonly TORCH_VISIBILITY = 10;   // Expanded view radius with big torch (full maze)
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
    // All sprites must be in the SAME container for z-index sorting to work!
    this.staticContainer = new Container();
    this.staticContainer.sortableChildren = true;
    this.gameContainer.addChild(this.staticContainer);

    // Player graphics - must be in staticContainer for z-sorting with walls
    this.playerGraphics = new Graphics();
    this.staticContainer.addChild(this.playerGraphics);

    // Flag graphics - must be in staticContainer for z-sorting with walls
    this.flagGraphics = new Graphics();
    this.staticContainer.addChild(this.flagGraphics);

    // Hammer graphics - must be in staticContainer for z-sorting with walls
    this.hammerGraphics = new Graphics();
    this.staticContainer.addChild(this.hammerGraphics);

    // Hammer sparkles (magic particles)
    for (let i = 0; i < 5; i++) {
      const sparkle = new Graphics();
      sparkle.circle(0, 0, 2);
      sparkle.fill({ color: 0xffffff, alpha: 0.8 });
      this.hammerSparkles.push(sparkle);
      this.sparkleOffsets.push(Math.random() * 40); // Random starting offset
      this.staticContainer.addChild(sparkle);
    }

    // Cloak graphics - must be in staticContainer for z-sorting with walls
    this.cloakGraphics = new Graphics();
    this.staticContainer.addChild(this.cloakGraphics);

    // Cloak sparkles (purple magic particles)
    for (let i = 0; i < 5; i++) {
      const sparkle = new Graphics();
      sparkle.circle(0, 0, 2);
      sparkle.fill({ color: 0xaa66ff, alpha: 0.8 });
      this.cloakSparkles.push(sparkle);
      this.cloakSparkleOffsets.push(Math.random() * 40);
      this.staticContainer.addChild(sparkle);
    }

    // Big torch graphics - must be in staticContainer for z-sorting with walls
    this.bigTorchGraphics = new Graphics();
    this.staticContainer.addChild(this.bigTorchGraphics);

    // Big torch sparkles (orange/yellow magic particles)
    for (let i = 0; i < 5; i++) {
      const sparkle = new Graphics();
      sparkle.circle(0, 0, 3);
      sparkle.fill({ color: 0xffaa00, alpha: 0.9 });
      this.bigTorchSparkles.push(sparkle);
      this.bigTorchSparkleOffsets.push(Math.random() * 40);
      this.staticContainer.addChild(sparkle);
    }

    // Ice shard graphics - must be in staticContainer for z-sorting with walls
    this.iceShardGraphics = new Graphics();
    this.staticContainer.addChild(this.iceShardGraphics);

    // Ice shard sparkles (cyan/white magic particles)
    for (let i = 0; i < 5; i++) {
      const sparkle = new Graphics();
      sparkle.circle(0, 0, 2);
      sparkle.fill({ color: 0x88ddff, alpha: 0.9 });
      this.iceShardSparkles.push(sparkle);
      this.iceShardSparkleOffsets.push(Math.random() * 40);
      this.staticContainer.addChild(sparkle);
    }

    // Ice projectile graphics
    this.iceProjectileGraphics = new Graphics();
    this.iceProjectileGraphics.visible = false;
    this.staticContainer.addChild(this.iceProjectileGraphics);

    // Fog of war container (drawn on top of everything except HUD)
    this.fogContainer = new Container();
    this.fogContainer.sortableChildren = true;
    this.gameContainer.addChild(this.fogContainer);

    // HUD container (fixed position, not affected by game camera)
    this.hudContainer = new Container();
    this.hudContainer.x = 20;
    this.hudContainer.y = 20;
    this.app.stage.addChild(this.hudContainer);

    // Character face circle (placeholder)
    this.hudFace = new Graphics();
    this.hudContainer.addChild(this.hudFace);

    // Inventory slot 1 (hammer)
    this.hudSlot1 = new Graphics();
    this.hudContainer.addChild(this.hudSlot1);

    // Inventory slot 2 (cloak/invisibility)
    this.hudSlot2 = new Graphics();
    this.hudContainer.addChild(this.hudSlot2);

    // Inventory slot 3 (big torch)
    this.hudSlot3 = new Graphics();
    this.hudContainer.addChild(this.hudSlot3);

    // Inventory slot 4 (ice shard)
    this.hudSlot4 = new Graphics();
    this.hudContainer.addChild(this.hudSlot4);

    this.drawHUD();
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
        // Update z-index cell only when movement completes
        this.playerZCell.x = this.player.x;
        this.playerZCell.y = this.player.y;
        this.updatePlayerPosition();
      }

      // Animate hammer sparkles (magic effect)
      this.animateHammerSparkles();

      // Animate cloak sparkles
      this.animateCloakSparkles();

      // Animate big torch sparkles
      this.animateBigTorchSparkles();

      // Animate ice shard sparkles
      this.animateIceShardSparkles();

      // Update ice projectile
      this.updateIceProjectile();

      // Check invisibility timer
      this.updateInvisibility();

      // Check torch power timer
      this.updateTorchPower();

      // Update fog of war
      this.updateFog();
    });
  }

  private animateHammerSparkles(): void {
    if (this.hammer.pickedUp) {
      // Hide all sparkles when hammer is picked up
      this.hammerSparkles.forEach(s => s.visible = false);
      return;
    }

    const { x, y } = this.toIso(this.hammer.x, this.hammer.y);
    const scale = this.tileWidth / 80;
    const xOffsets = [-12, -5, 0, 7, 14]; // Horizontal spread

    this.hammerSparkles.forEach((sparkle, i) => {
      // Move sparkle upward
      this.sparkleOffsets[i] += 0.5;

      // Reset to bottom when reaching top
      if (this.sparkleOffsets[i] > 45) {
        this.sparkleOffsets[i] = 0;
      }

      // Position sparkle
      sparkle.x = x + xOffsets[i] * scale;
      sparkle.y = y - this.sparkleOffsets[i] * scale;
      sparkle.zIndex = (this.hammer.x + this.hammer.y) * 100 + 25;
      sparkle.visible = true;

      // Fade based on position (fade out at top)
      sparkle.alpha = 1 - (this.sparkleOffsets[i] / 45) * 0.7;
    });
  }

  private animateCloakSparkles(): void {
    if (this.cloak.pickedUp) {
      // Hide all sparkles when cloak is picked up
      this.cloakSparkles.forEach(s => s.visible = false);
      return;
    }

    const { x, y } = this.toIso(this.cloak.x, this.cloak.y);
    const scale = this.tileWidth / 80;
    const xOffsets = [-10, -4, 2, 8, 14]; // Horizontal spread

    this.cloakSparkles.forEach((sparkle, i) => {
      // Move sparkle upward
      this.cloakSparkleOffsets[i] += 0.4;

      // Reset to bottom when reaching top
      if (this.cloakSparkleOffsets[i] > 50) {
        this.cloakSparkleOffsets[i] = 0;
      }

      // Position sparkle
      sparkle.x = x + xOffsets[i] * scale;
      sparkle.y = y - this.cloakSparkleOffsets[i] * scale;
      sparkle.zIndex = (this.cloak.x + this.cloak.y) * 100 + 25;
      sparkle.visible = true;

      // Fade based on position (fade out at top)
      sparkle.alpha = 1 - (this.cloakSparkleOffsets[i] / 50) * 0.7;
    });
  }

  private animateBigTorchSparkles(): void {
    if (this.bigTorch.pickedUp) {
      // Hide all sparkles when big torch is picked up
      this.bigTorchSparkles.forEach(s => s.visible = false);
      return;
    }

    const { x, y } = this.toIso(this.bigTorch.x, this.bigTorch.y);
    const scale = this.tileWidth / 80;
    const xOffsets = [-8, -3, 2, 7, 12]; // Horizontal spread

    this.bigTorchSparkles.forEach((sparkle, i) => {
      // Move sparkle upward
      this.bigTorchSparkleOffsets[i] += 0.6;

      // Reset to bottom when reaching top
      if (this.bigTorchSparkleOffsets[i] > 55) {
        this.bigTorchSparkleOffsets[i] = 0;
      }

      // Position sparkle
      sparkle.x = x + xOffsets[i] * scale;
      sparkle.y = y - this.bigTorchSparkleOffsets[i] * scale - 20 * scale;
      sparkle.zIndex = (this.bigTorch.x + this.bigTorch.y) * 100 + 25;
      sparkle.visible = true;

      // Fade based on position (fade out at top)
      sparkle.alpha = 1 - (this.bigTorchSparkleOffsets[i] / 55) * 0.6;
    });
  }

  private animateIceShardSparkles(): void {
    if (this.iceShard.pickedUp) {
      // Hide all sparkles when ice shard is picked up
      this.iceShardSparkles.forEach(s => s.visible = false);
      return;
    }

    const { x, y } = this.toIso(this.iceShard.x, this.iceShard.y);
    const scale = this.tileWidth / 80;
    const xOffsets = [-10, -4, 2, 8, 12]; // Horizontal spread

    this.iceShardSparkles.forEach((sparkle, i) => {
      // Move sparkle upward
      this.iceShardSparkleOffsets[i] += 0.5;

      // Reset to bottom when reaching top
      if (this.iceShardSparkleOffsets[i] > 45) {
        this.iceShardSparkleOffsets[i] = 0;
      }

      // Position sparkle
      sparkle.x = x + xOffsets[i] * scale;
      sparkle.y = y - this.iceShardSparkleOffsets[i] * scale - 10 * scale;
      sparkle.zIndex = (this.iceShard.x + this.iceShard.y) * 100 + 25;
      sparkle.visible = true;

      // Fade based on position (fade out at top)
      sparkle.alpha = 1 - (this.iceShardSparkleOffsets[i] / 45) * 0.7;
    });
  }

  private updateIceProjectile(): void {
    if (!this.iceProjectile.active) {
      this.iceProjectileGraphics.visible = false;
      return;
    }

    const speed = 0.15; // Constant speed per frame (tiles per frame)

    // Move projectile at constant speed in its direction
    switch (this.iceProjectile.direction) {
      case 'up':
        this.iceProjectile.visualY -= speed;
        break;
      case 'down':
        this.iceProjectile.visualY += speed;
        break;
      case 'left':
        this.iceProjectile.visualX -= speed;
        break;
      case 'right':
        this.iceProjectile.visualX += speed;
        break;
    }

    // Check if projectile has reached or passed the target cell
    const reachedTarget =
      (this.iceProjectile.direction === 'up' && this.iceProjectile.visualY <= this.iceProjectile.y) ||
      (this.iceProjectile.direction === 'down' && this.iceProjectile.visualY >= this.iceProjectile.y) ||
      (this.iceProjectile.direction === 'left' && this.iceProjectile.visualX <= this.iceProjectile.x) ||
      (this.iceProjectile.direction === 'right' && this.iceProjectile.visualX >= this.iceProjectile.x);

    if (reachedTarget) {
      // Snap to target cell
      this.iceProjectile.visualX = this.iceProjectile.x;
      this.iceProjectile.visualY = this.iceProjectile.y;

      // Calculate next cell based on direction
      let nextX = this.iceProjectile.x;
      let nextY = this.iceProjectile.y;
      switch (this.iceProjectile.direction) {
        case 'up': nextY--; break;
        case 'down': nextY++; break;
        case 'left': nextX--; break;
        case 'right': nextX++; break;
      }

      // Check bounds first
      if (nextX < 0 || nextX >= this.MAZE_WIDTH || nextY < 0 || nextY >= this.MAZE_HEIGHT) {
        this.iceProjectile.active = false;
        this.iceProjectileGraphics.visible = false;
        return;
      }

      // Check if projectile can continue (no wall blocking)
      if (this.maze.canMove(this.iceProjectile.x, this.iceProjectile.y, nextX, nextY)) {
        this.iceProjectile.x = nextX;
        this.iceProjectile.y = nextY;
      } else {
        // Hit a wall - projectile stops
        this.iceProjectile.active = false;
        this.iceProjectileGraphics.visible = false;
        return;
      }
    }

    // Update projectile visual position
    const { x, y } = this.toIso(this.iceProjectile.visualX, this.iceProjectile.visualY);
    this.iceProjectileGraphics.x = x;
    this.iceProjectileGraphics.y = y;
    this.iceProjectileGraphics.zIndex = (Math.round(this.iceProjectile.visualX) + Math.round(this.iceProjectile.visualY)) * 100 + 50;
    this.iceProjectileGraphics.visible = true;
  }

  private shootIce(): void {
    if (!this.player.hasIce || this.iceProjectile.active) return;

    // Use the ice
    this.player.hasIce = false;

    // Initialize projectile at player position
    this.iceProjectile.active = true;
    this.iceProjectile.x = this.player.x;
    this.iceProjectile.y = this.player.y;
    this.iceProjectile.visualX = this.player.x;
    this.iceProjectile.visualY = this.player.y;
    this.iceProjectile.direction = this.playerDirection;

    // Draw the projectile
    this.drawIceProjectile();
    this.updateHUD();
  }

  private drawIceProjectile(): void {
    const scale = this.tileWidth / 80;

    this.iceProjectileGraphics.clear();

    // Glow
    this.iceProjectileGraphics.circle(0, -10 * scale, 15 * scale);
    this.iceProjectileGraphics.fill({ color: 0x88ddff, alpha: 0.4 });

    // Ice crystal shape (pointed shard)
    this.iceProjectileGraphics.moveTo(0, -25 * scale);
    this.iceProjectileGraphics.lineTo(-8 * scale, -5 * scale);
    this.iceProjectileGraphics.lineTo(-4 * scale, 5 * scale);
    this.iceProjectileGraphics.lineTo(4 * scale, 5 * scale);
    this.iceProjectileGraphics.lineTo(8 * scale, -5 * scale);
    this.iceProjectileGraphics.closePath();
    this.iceProjectileGraphics.fill({ color: 0x66ccff });

    // Inner highlight
    this.iceProjectileGraphics.moveTo(0, -20 * scale);
    this.iceProjectileGraphics.lineTo(-4 * scale, -5 * scale);
    this.iceProjectileGraphics.lineTo(0, 0);
    this.iceProjectileGraphics.lineTo(4 * scale, -5 * scale);
    this.iceProjectileGraphics.closePath();
    this.iceProjectileGraphics.fill({ color: 0xaaeeff });

    // Bright center
    this.iceProjectileGraphics.circle(0, -10 * scale, 3 * scale);
    this.iceProjectileGraphics.fill({ color: 0xffffff, alpha: 0.8 });
  }

  private updateInvisibility(): void {
    if (this.invisibility.active && Date.now() >= this.invisibility.endTime) {
      // Invisibility expired
      this.invisibility.active = false;
      this.initPlayerGraphics(); // Redraw player without invisibility
      this.updateHUD();
    }

    // Update HUD timer display while invisible
    if (this.invisibility.active) {
      this.updateHUD();
    }

    // Apply shimmer effect when invisible
    if (this.invisibility.active) {
      // Pulsing alpha effect
      const timeLeft = this.invisibility.endTime - Date.now();
      const pulse = 0.3 + Math.sin(Date.now() / 100) * 0.1;
      // Flash more when about to expire (last 2 seconds)
      if (timeLeft < 2000) {
        this.playerGraphics.alpha = 0.3 + Math.sin(Date.now() / 50) * 0.3;
      } else {
        this.playerGraphics.alpha = pulse;
      }
    } else {
      this.playerGraphics.alpha = 1;
    }
  }

  private updateTorchPower(): void {
    if (this.torchPower.active && Date.now() >= this.torchPower.endTime) {
      // Torch power expired
      this.torchPower.active = false;
      this.updateHUD();
    }

    // Update HUD timer display while torch is active
    if (this.torchPower.active) {
      this.updateHUD();
    }
  }

  private updateFog(): void {
    // Clear previous fog
    while (this.fogContainer.children.length > 0) {
      const child = this.fogContainer.children[0];
      this.fogContainer.removeChild(child);
      child.destroy();
    }

    const visibility = this.torchPower.active ? this.TORCH_VISIBILITY : this.BASE_VISIBILITY;
    const playerX = Math.round(this.playerVisual.x);
    const playerY = Math.round(this.playerVisual.y);

    // Draw fog for each cell outside visibility
    for (let y = 0; y < this.MAZE_HEIGHT; y++) {
      for (let x = 0; x < this.MAZE_WIDTH; x++) {
        const distance = Math.abs(x - playerX) + Math.abs(y - playerY); // Manhattan distance

        if (distance > visibility) {
          // Fully fogged
          this.drawFogTile(x, y, 0.9);
        } else if (distance > visibility - 1) {
          // Partial fog (edge of visibility)
          this.drawFogTile(x, y, 0.5);
        }
      }
    }
  }

  private drawFogTile(gridX: number, gridY: number, alpha: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    const fog = new Graphics();
    fog.poly([
      { x: 0, y: -hh - this.wallHeight },
      { x: hw, y: -this.wallHeight },
      { x: hw, y: hh },
      { x: 0, y: hh + hh },
      { x: -hw, y: hh },
      { x: -hw, y: -this.wallHeight },
    ]);
    fog.fill({ color: 0x000000, alpha });

    fog.x = x;
    fog.y = y;
    fog.zIndex = (gridX + gridY) * 100 + 99; // Draw on top of everything in that cell
    this.fogContainer.addChild(fog);
  }

  generateNewMaze(): void {
    this.maze = new Maze(this.MAZE_WIDTH, this.MAZE_HEIGHT);
    this.player = { x: 0, y: 0, hasHammer: false, hasIce: false };
    this.playerVisual = { x: 0, y: 0 };
    this.playerZCell = { x: 0, y: 0 };
    this.playerDirection = 'down';
    this.flag = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 1)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 1)) + 1,
      captured: false
    };
    this.hammer = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1,
      pickedUp: false
    };
    this.exit = { x: this.MAZE_WIDTH - 1, y: this.MAZE_HEIGHT - 1 };

    // Ensure flag isn't at exit or start
    if (this.flag.x === this.exit.x && this.flag.y === this.exit.y) {
      this.flag.x = Math.max(0, this.exit.x - 1);
    }

    // Ensure hammer isn't at flag, exit, or start
    while ((this.hammer.x === this.flag.x && this.hammer.y === this.flag.y) ||
           (this.hammer.x === this.exit.x && this.hammer.y === this.exit.y) ||
           (this.hammer.x === 0 && this.hammer.y === 0)) {
      this.hammer.x = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
      this.hammer.y = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
    }

    // Initialize cloak position
    this.cloak = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1,
      pickedUp: false
    };

    // Ensure cloak isn't at flag, exit, start, or hammer
    while ((this.cloak.x === this.flag.x && this.cloak.y === this.flag.y) ||
           (this.cloak.x === this.exit.x && this.cloak.y === this.exit.y) ||
           (this.cloak.x === this.hammer.x && this.cloak.y === this.hammer.y) ||
           (this.cloak.x === 0 && this.cloak.y === 0)) {
      this.cloak.x = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
      this.cloak.y = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
    }

    // Initialize big torch position
    this.bigTorch = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1,
      pickedUp: false
    };

    // Ensure big torch isn't at flag, exit, start, hammer, or cloak
    while ((this.bigTorch.x === this.flag.x && this.bigTorch.y === this.flag.y) ||
           (this.bigTorch.x === this.exit.x && this.bigTorch.y === this.exit.y) ||
           (this.bigTorch.x === this.hammer.x && this.bigTorch.y === this.hammer.y) ||
           (this.bigTorch.x === this.cloak.x && this.bigTorch.y === this.cloak.y) ||
           (this.bigTorch.x === 0 && this.bigTorch.y === 0)) {
      this.bigTorch.x = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
      this.bigTorch.y = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
    }

    // Initialize ice shard position
    this.iceShard = {
      x: Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1,
      y: Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1,
      pickedUp: false
    };

    // Ensure ice shard isn't at other pickups
    while ((this.iceShard.x === this.flag.x && this.iceShard.y === this.flag.y) ||
           (this.iceShard.x === this.exit.x && this.iceShard.y === this.exit.y) ||
           (this.iceShard.x === this.hammer.x && this.iceShard.y === this.hammer.y) ||
           (this.iceShard.x === this.cloak.x && this.iceShard.y === this.cloak.y) ||
           (this.iceShard.x === this.bigTorch.x && this.iceShard.y === this.bigTorch.y) ||
           (this.iceShard.x === 0 && this.iceShard.y === 0)) {
      this.iceShard.x = Math.floor(Math.random() * (this.MAZE_WIDTH - 2)) + 1;
      this.iceShard.y = Math.floor(Math.random() * (this.MAZE_HEIGHT - 2)) + 1;
    }

    // Reset invisibility, torch power, and ice projectile
    this.invisibility = { active: false, endTime: 0 };
    this.torchPower = { active: false, endTime: 0 };
    this.iceProjectile = { active: false, x: 0, y: 0, visualX: 0, visualY: 0, direction: 'down' };

    // Reset sparkle positions
    for (let i = 0; i < this.sparkleOffsets.length; i++) {
      this.sparkleOffsets[i] = Math.random() * 40;
    }
    for (let i = 0; i < this.cloakSparkleOffsets.length; i++) {
      this.cloakSparkleOffsets[i] = Math.random() * 40;
    }
    for (let i = 0; i < this.bigTorchSparkleOffsets.length; i++) {
      this.bigTorchSparkleOffsets[i] = Math.random() * 40;
    }
    for (let i = 0; i < this.iceShardSparkleOffsets.length; i++) {
      this.iceShardSparkleOffsets[i] = Math.random() * 40;
    }

    this.initPlayerGraphics();
    this.drawMaze();
    this.updatePlayerPosition();
    this.updateFlagVisibility();
    this.updateHammerVisibility();
    this.updateCloakVisibility();
    this.updateBigTorchVisibility();
    this.updateIceShardVisibility();
    if (this.hudSlot1) this.updateHUD(); // Update HUD if initialized
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.maze) return;

    let newX = this.player.x;
    let newY = this.player.y;
    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

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

    if (direction && direction !== this.playerDirection) {
      this.playerDirection = direction;
      this.initPlayerGraphics(); // Redraw player to show new direction
    }

    if (this.maze.canMove(this.player.x, this.player.y, newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
      this.checkPickups();
    }
  }

  private checkPickups(): void {
    // Check hammer pickup
    if (!this.hammer.pickedUp && this.player.x === this.hammer.x && this.player.y === this.hammer.y) {
      this.hammer.pickedUp = true;
      this.player.hasHammer = true;
      this.updateHammerVisibility();
      this.initPlayerGraphics(); // Redraw player with hammer
      this.updateHUD();
    }

    // Check cloak pickup
    if (!this.cloak.pickedUp && this.player.x === this.cloak.x && this.player.y === this.cloak.y) {
      this.cloak.pickedUp = true;
      this.invisibility.active = true;
      this.invisibility.endTime = Date.now() + 10000; // 10 seconds
      this.updateCloakVisibility();
      this.initPlayerGraphics(); // Redraw player with invisibility effect
      this.updateHUD();
    }

    // Check big torch pickup
    if (!this.bigTorch.pickedUp && this.player.x === this.bigTorch.x && this.player.y === this.bigTorch.y) {
      this.bigTorch.pickedUp = true;
      this.torchPower.active = true;
      this.torchPower.endTime = Date.now() + 10000; // 10 seconds expanded vision
      this.updateBigTorchVisibility();
      this.updateHUD();
    }

    // Check ice shard pickup
    if (!this.iceShard.pickedUp && this.player.x === this.iceShard.x && this.player.y === this.iceShard.y) {
      this.iceShard.pickedUp = true;
      this.player.hasIce = true;
      this.updateIceShardVisibility();
      this.updateHUD();
    }

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

  private trySmashWall(): void {
    // Must have hammer to smash
    if (!this.player.hasHammer) return;

    const { x, y } = this.player;
    const cell = this.maze.cells[y]?.[x];
    if (!cell) return;

    // Check if there's a wall in the facing direction
    let wallExists = false;
    let adjacentX = x;
    let adjacentY = y;
    let currentWallKey: 'top' | 'bottom' | 'left' | 'right';
    let adjacentWallKey: 'top' | 'bottom' | 'left' | 'right';

    switch (this.playerDirection) {
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

    // No wall to smash
    if (!wallExists) return;

    // Don't smash outer boundary walls
    if (adjacentX < 0 || adjacentX >= this.MAZE_WIDTH ||
        adjacentY < 0 || adjacentY >= this.MAZE_HEIGHT) {
      return;
    }

    // Smash the wall! Remove from both cells
    cell.walls[currentWallKey] = false;
    const adjacentCell = this.maze.cells[adjacentY]?.[adjacentX];
    if (adjacentCell) {
      adjacentCell.walls[adjacentWallKey] = false;
    }

    // Player loses the hammer
    this.player.hasHammer = false;

    // Redraw player without hammer
    this.initPlayerGraphics();

    // Redraw the maze to reflect the broken wall
    this.drawMaze();
    this.updatePlayerPosition();
    this.updateHUD();
  }

  // Draw static maze elements (only called on maze change)
  private drawMaze(): void {
    // Clear static container but preserve persistent graphics
    const persistentGraphics = new Set<Graphics>([
      this.playerGraphics,
      this.flagGraphics,
      this.hammerGraphics,
      this.cloakGraphics,
      this.bigTorchGraphics,
      ...this.hammerSparkles,
      ...this.cloakSparkles,
      ...this.bigTorchSparkles,
      this.iceShardGraphics,
      ...this.iceShardSparkles,
      this.iceProjectileGraphics
    ]);

    while (this.staticContainer.children.length > 0) {
      const child = this.staticContainer.children[0];
      this.staticContainer.removeChild(child);
      // Only destroy dynamically created graphics (floors, walls, exit)
      if (!persistentGraphics.has(child as Graphics)) {
        child.destroy();
      }
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

    // Re-add persistent graphics to the container
    this.staticContainer.addChild(this.playerGraphics);
    this.staticContainer.addChild(this.flagGraphics);
    this.staticContainer.addChild(this.hammerGraphics);
    this.staticContainer.addChild(this.cloakGraphics);
    this.staticContainer.addChild(this.bigTorchGraphics);
    for (const sparkle of this.hammerSparkles) {
      this.staticContainer.addChild(sparkle);
    }
    for (const sparkle of this.cloakSparkles) {
      this.staticContainer.addChild(sparkle);
    }
    for (const sparkle of this.bigTorchSparkles) {
      this.staticContainer.addChild(sparkle);
    }
    this.staticContainer.addChild(this.iceShardGraphics);
    for (const sparkle of this.iceShardSparkles) {
      this.staticContainer.addChild(sparkle);
    }
    this.staticContainer.addChild(this.iceProjectileGraphics);

    // Draw flag, hammer, cloak, big torch, and ice shard
    this.drawFlagGraphics();
    this.drawHammerGraphics();
    this.drawCloakGraphics();
    this.drawBigTorchGraphics();
    this.drawIceShardGraphics();
  }

  // Update player position (called every animation frame - no object recreation)
  private updatePlayerPosition(): void {
    const { x, y } = this.toIso(this.playerVisual.x, this.playerVisual.y);
    this.playerGraphics.x = x;
    this.playerGraphics.y = y;
    // Z-index: use the NEXT cell's depth when moving toward camera (down/right)
    // This ensures player appears behind front walls of destination cell
    const cellX = Math.floor(this.playerVisual.x + 0.5); // round to nearest
    const cellY = Math.floor(this.playerVisual.y + 0.5);
    // Offset +20 keeps player behind front walls (+90) and side corners (+40)
    this.playerGraphics.zIndex = (cellX + cellY) * 100 + 20;
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
    this.flagGraphics.zIndex = (this.flag.x + this.flag.y) * 100 + 20;
    this.flagGraphics.visible = !this.flag.captured;
  }

  // Update hammer visibility
  private updateHammerVisibility(): void {
    this.hammerGraphics.visible = !this.hammer.pickedUp;
  }

  // Update cloak visibility
  private updateCloakVisibility(): void {
    this.cloakGraphics.visible = !this.cloak.pickedUp;
  }

  // Draw hammer graphics (floating hammer pickup)
  private drawHammerGraphics(): void {
    const { x, y } = this.toIso(this.hammer.x, this.hammer.y);
    const scale = this.tileWidth / 80;

    this.hammerGraphics.clear();

    // Glow effect
    this.hammerGraphics.circle(0, -15 * scale, 20 * scale);
    this.hammerGraphics.fill({ color: 0x88ccff, alpha: 0.3 });

    // Hammer handle (wooden)
    this.hammerGraphics.roundRect(-2 * scale, -20 * scale, 4 * scale, 25 * scale, 2 * scale);
    this.hammerGraphics.fill({ color: 0x8b4513 });

    // Hammer head (metal) - sits on top of handle
    this.hammerGraphics.roundRect(-10 * scale, -28 * scale, 20 * scale, 10 * scale, 3 * scale);
    this.hammerGraphics.fill({ color: 0x666666 });

    // Hammer head highlight
    this.hammerGraphics.roundRect(-8 * scale, -26 * scale, 16 * scale, 3 * scale, 2 * scale);
    this.hammerGraphics.fill({ color: 0x888888 });

    this.hammerGraphics.x = x;
    this.hammerGraphics.y = y;
    this.hammerGraphics.zIndex = (this.hammer.x + this.hammer.y) * 100 + 20;
    this.hammerGraphics.visible = !this.hammer.pickedUp;
  }

  // Draw cloak graphics (floating invisibility cloak pickup)
  private drawCloakGraphics(): void {
    const { x, y } = this.toIso(this.cloak.x, this.cloak.y);
    const scale = this.tileWidth / 80;

    this.cloakGraphics.clear();

    // Purple magical glow
    this.cloakGraphics.circle(0, -15 * scale, 22 * scale);
    this.cloakGraphics.fill({ color: 0x8844cc, alpha: 0.3 });

    // Cloak body (flowing shape)
    this.cloakGraphics.moveTo(0, -35 * scale);
    this.cloakGraphics.quadraticCurveTo(-15 * scale, -30 * scale, -12 * scale, -10 * scale);
    this.cloakGraphics.quadraticCurveTo(-10 * scale, 0, -8 * scale, 5 * scale);
    this.cloakGraphics.quadraticCurveTo(0, 8 * scale, 8 * scale, 5 * scale);
    this.cloakGraphics.quadraticCurveTo(10 * scale, 0, 12 * scale, -10 * scale);
    this.cloakGraphics.quadraticCurveTo(15 * scale, -30 * scale, 0, -35 * scale);
    this.cloakGraphics.fill({ color: 0x6633aa });

    // Cloak inner (darker)
    this.cloakGraphics.moveTo(0, -30 * scale);
    this.cloakGraphics.quadraticCurveTo(-8 * scale, -25 * scale, -6 * scale, -10 * scale);
    this.cloakGraphics.quadraticCurveTo(-4 * scale, 0, 0, 2 * scale);
    this.cloakGraphics.quadraticCurveTo(4 * scale, 0, 6 * scale, -10 * scale);
    this.cloakGraphics.quadraticCurveTo(8 * scale, -25 * scale, 0, -30 * scale);
    this.cloakGraphics.fill({ color: 0x442288 });

    // Hood
    this.cloakGraphics.ellipse(0, -32 * scale, 8 * scale, 6 * scale);
    this.cloakGraphics.fill({ color: 0x5522aa });

    // Mysterious eye symbols
    this.cloakGraphics.circle(-3 * scale, -18 * scale, 2 * scale);
    this.cloakGraphics.fill({ color: 0xaa88ff, alpha: 0.6 });
    this.cloakGraphics.circle(3 * scale, -18 * scale, 2 * scale);
    this.cloakGraphics.fill({ color: 0xaa88ff, alpha: 0.6 });

    this.cloakGraphics.x = x;
    this.cloakGraphics.y = y;
    this.cloakGraphics.zIndex = (this.cloak.x + this.cloak.y) * 100 + 20;
    this.cloakGraphics.visible = !this.cloak.pickedUp;
  }

  // Update big torch visibility
  private updateBigTorchVisibility(): void {
    this.bigTorchGraphics.visible = !this.bigTorch.pickedUp;
  }

  // Draw big torch graphics (floating larger torch pickup)
  private drawBigTorchGraphics(): void {
    const { x, y } = this.toIso(this.bigTorch.x, this.bigTorch.y);
    const scale = this.tileWidth / 80;

    this.bigTorchGraphics.clear();

    // Warm orange/yellow magical glow
    this.bigTorchGraphics.circle(0, -25 * scale, 28 * scale);
    this.bigTorchGraphics.fill({ color: 0xff8800, alpha: 0.3 });

    // Large torch handle (wooden, thick)
    this.bigTorchGraphics.roundRect(-4 * scale, -30 * scale, 8 * scale, 35 * scale, 3 * scale);
    this.bigTorchGraphics.fill({ color: 0x6b3a1a });

    // Handle wrap (decorative bands)
    this.bigTorchGraphics.roundRect(-5 * scale, -10 * scale, 10 * scale, 4 * scale, 2 * scale);
    this.bigTorchGraphics.fill({ color: 0x8b5a2b });
    this.bigTorchGraphics.roundRect(-5 * scale, -20 * scale, 10 * scale, 4 * scale, 2 * scale);
    this.bigTorchGraphics.fill({ color: 0x8b5a2b });

    // Torch head (metal bracket)
    this.bigTorchGraphics.roundRect(-8 * scale, -38 * scale, 16 * scale, 10 * scale, 3 * scale);
    this.bigTorchGraphics.fill({ color: 0x555555 });

    // Large flame (outer - orange)
    this.bigTorchGraphics.ellipse(0, -50 * scale, 12 * scale, 18 * scale);
    this.bigTorchGraphics.fill({ color: 0xff6600 });

    // Medium flame (yellow)
    this.bigTorchGraphics.ellipse(0, -52 * scale, 8 * scale, 14 * scale);
    this.bigTorchGraphics.fill({ color: 0xffaa00 });

    // Inner flame (bright yellow/white)
    this.bigTorchGraphics.ellipse(0, -54 * scale, 4 * scale, 10 * scale);
    this.bigTorchGraphics.fill({ color: 0xffdd44 });

    this.bigTorchGraphics.x = x;
    this.bigTorchGraphics.y = y;
    this.bigTorchGraphics.zIndex = (this.bigTorch.x + this.bigTorch.y) * 100 + 20;
    this.bigTorchGraphics.visible = !this.bigTorch.pickedUp;
  }

  // Update ice shard visibility
  private updateIceShardVisibility(): void {
    this.iceShardGraphics.visible = !this.iceShard.pickedUp;
  }

  // Draw ice shard graphics (floating ice crystal pickup)
  private drawIceShardGraphics(): void {
    const { x, y } = this.toIso(this.iceShard.x, this.iceShard.y);
    const scale = this.tileWidth / 80;

    this.iceShardGraphics.clear();

    // Cyan/blue magical glow
    this.iceShardGraphics.circle(0, -20 * scale, 25 * scale);
    this.iceShardGraphics.fill({ color: 0x44aaff, alpha: 0.3 });

    // Main ice crystal (pointed shard shape)
    this.iceShardGraphics.moveTo(0, -45 * scale);
    this.iceShardGraphics.lineTo(-10 * scale, -20 * scale);
    this.iceShardGraphics.lineTo(-6 * scale, 0);
    this.iceShardGraphics.lineTo(6 * scale, 0);
    this.iceShardGraphics.lineTo(10 * scale, -20 * scale);
    this.iceShardGraphics.closePath();
    this.iceShardGraphics.fill({ color: 0x66ccff });

    // Inner crystal facet (lighter)
    this.iceShardGraphics.moveTo(0, -40 * scale);
    this.iceShardGraphics.lineTo(-5 * scale, -20 * scale);
    this.iceShardGraphics.lineTo(0, -5 * scale);
    this.iceShardGraphics.lineTo(5 * scale, -20 * scale);
    this.iceShardGraphics.closePath();
    this.iceShardGraphics.fill({ color: 0x99ddff });

    // Highlight streak
    this.iceShardGraphics.moveTo(-2 * scale, -35 * scale);
    this.iceShardGraphics.lineTo(-1 * scale, -15 * scale);
    this.iceShardGraphics.lineTo(1 * scale, -15 * scale);
    this.iceShardGraphics.lineTo(2 * scale, -35 * scale);
    this.iceShardGraphics.closePath();
    this.iceShardGraphics.fill({ color: 0xffffff, alpha: 0.6 });

    // Bright tip
    this.iceShardGraphics.circle(0, -42 * scale, 3 * scale);
    this.iceShardGraphics.fill({ color: 0xffffff, alpha: 0.8 });

    this.iceShardGraphics.x = x;
    this.iceShardGraphics.y = y;
    this.iceShardGraphics.zIndex = (this.iceShard.x + this.iceShard.y) * 100 + 20;
    this.iceShardGraphics.visible = !this.iceShard.pickedUp;
  }

  // Create Gardener character graphics with directional face
  private initPlayerGraphics(): void {
    const scale = this.tileWidth / 80;

    this.playerGraphics.clear();

    // Shadow (20% opacity)
    this.playerGraphics.ellipse(0, 5 * scale, 15 * scale, 8 * scale);
    this.playerGraphics.fill({ color: 0x000000, alpha: GARDEN.shadowAlpha });

    // Legs (simple animation hint based on direction)
    const legOffset = Math.sin(Date.now() / 200) * 2; // Subtle movement
    // Left leg
    this.playerGraphics.roundRect(-6 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsDark });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right leg
    this.playerGraphics.roundRect(1 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsDark });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Blue overalls body
    this.playerGraphics.roundRect(-10 * scale, -22 * scale, 20 * scale, 22 * scale, 4 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsBlue });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Overall straps
    this.playerGraphics.roundRect(-8 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsBlue });
    this.playerGraphics.roundRect(4 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsBlue });

    // Overall pocket
    this.playerGraphics.roundRect(-4 * scale, -12 * scale, 8 * scale, 6 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.overallsDark });

    // Arms (peach skin)
    // Left arm
    this.playerGraphics.roundRect(-14 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.skinPeach });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right arm
    this.playerGraphics.roundRect(9 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.skinPeach });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Head (peach skin)
    this.playerGraphics.circle(0, -32 * scale, 10 * scale);
    this.playerGraphics.fill({ color: GARDEN.skinPeach });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Face direction handling
    let faceOffsetX = 0;
    switch (this.playerDirection) {
      case 'left': faceOffsetX = -3; break;
      case 'right': faceOffsetX = 3; break;
    }

    // Eyes - positioned based on direction
    let eye1X = -3, eye1Y = -33;
    let eye2X = 3, eye2Y = -33;
    switch (this.playerDirection) {
      case 'down':
        eye1X = -3; eye2X = 3;
        eye1Y = eye2Y = -31;
        break;
      case 'up':
        break; // No eyes visible
      case 'left':
        eye1X = eye2X = -5;
        eye1Y = -34; eye2Y = -30;
        break;
      case 'right':
        eye1X = eye2X = 5;
        eye1Y = -34; eye2Y = -30;
        break;
    }

    // Draw eyes (only visible when not facing away)
    if (this.playerDirection !== 'up') {
      this.playerGraphics.circle(eye1X * scale, eye1Y * scale, 2 * scale);
      this.playerGraphics.fill({ color: 0x2a2a2a });
      this.playerGraphics.circle(eye2X * scale, eye2Y * scale, 2 * scale);
      this.playerGraphics.fill({ color: 0x2a2a2a });

      // Rosy cheeks
      this.playerGraphics.circle((-5 + faceOffsetX) * scale, -29 * scale, 2 * scale);
      this.playerGraphics.fill({ color: 0xFFB6A3, alpha: 0.6 });
      this.playerGraphics.circle((5 + faceOffsetX) * scale, -29 * scale, 2 * scale);
      this.playerGraphics.fill({ color: 0xFFB6A3, alpha: 0.6 });

      // Smile
      switch (this.playerDirection) {
        case 'down':
          this.playerGraphics.moveTo(-3 * scale, -28 * scale);
          this.playerGraphics.quadraticCurveTo(0, -25 * scale, 3 * scale, -28 * scale);
          this.playerGraphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
        case 'left':
          this.playerGraphics.moveTo(-6 * scale, -28 * scale);
          this.playerGraphics.quadraticCurveTo(-4 * scale, -26 * scale, -3 * scale, -28 * scale);
          this.playerGraphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
        case 'right':
          this.playerGraphics.moveTo(3 * scale, -28 * scale);
          this.playerGraphics.quadraticCurveTo(4 * scale, -26 * scale, 6 * scale, -28 * scale);
          this.playerGraphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
      }
    }

    // Straw hat
    // Hat brim
    this.playerGraphics.ellipse(0, -40 * scale, 14 * scale, 5 * scale);
    this.playerGraphics.fill({ color: GARDEN.strawHat });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Hat crown
    this.playerGraphics.ellipse(0, -44 * scale, 9 * scale, 6 * scale);
    this.playerGraphics.fill({ color: GARDEN.strawHat });
    this.playerGraphics.roundRect(-9 * scale, -44 * scale, 18 * scale, 5 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.strawHat });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Hat band (red)
    this.playerGraphics.roundRect(-9 * scale, -42 * scale, 18 * scale, 3 * scale, 1 * scale);
    this.playerGraphics.fill({ color: GARDEN.roseRed });

    // Watering can in right hand
    // Can body
    this.playerGraphics.roundRect(12 * scale, -18 * scale, 10 * scale, 12 * scale, 3 * scale);
    this.playerGraphics.fill({ color: GARDEN.wateringCan });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Can spout
    this.playerGraphics.moveTo(22 * scale, -16 * scale);
    this.playerGraphics.lineTo(28 * scale, -22 * scale);
    this.playerGraphics.lineTo(26 * scale, -24 * scale);
    this.playerGraphics.lineTo(20 * scale, -18 * scale);
    this.playerGraphics.closePath();
    this.playerGraphics.fill({ color: GARDEN.wateringCan });
    this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Can handle
    this.playerGraphics.moveTo(14 * scale, -18 * scale);
    this.playerGraphics.quadraticCurveTo(10 * scale, -26 * scale, 14 * scale, -30 * scale);
    this.playerGraphics.stroke({ color: GARDEN.wateringCanDark, width: 3 * scale });

    // Spout rose (water outlet)
    this.playerGraphics.circle(27 * scale, -23 * scale, 2 * scale);
    this.playerGraphics.fill({ color: GARDEN.wateringCanDark });

    // Hammer in left hand (if picked up) - now a garden trowel style
    if (this.player.hasHammer) {
      // Trowel handle
      this.playerGraphics.roundRect(-20 * scale, -16 * scale, 4 * scale, 14 * scale, 2 * scale);
      this.playerGraphics.fill({ color: 0x8b4513 });
      this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Trowel head
      this.playerGraphics.moveTo(-22 * scale, -20 * scale);
      this.playerGraphics.lineTo(-14 * scale, -20 * scale);
      this.playerGraphics.lineTo(-18 * scale, -30 * scale);
      this.playerGraphics.closePath();
      this.playerGraphics.fill({ color: 0x888888 });
      this.playerGraphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    }
  }

  private drawFloor(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    const floor = new Graphics();

    // White marble base
    floor.poly([
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ]);
    floor.fill({ color: GARDEN.marbleWhite });

    // Marble vein pattern (subtle grey lines)
    // Use seeded randomness based on grid position for consistent patterns
    const seed = gridX * 7 + gridY * 13;
    const veinOffset1 = ((seed % 5) - 2) * 0.1;
    const veinOffset2 = ((seed % 7) - 3) * 0.08;

    // First vein
    floor.moveTo(-hw * 0.3, -hh * 0.2 + veinOffset1 * hh);
    floor.quadraticCurveTo(0, hh * 0.1 + veinOffset2 * hh, hw * 0.4, -hh * 0.1);
    floor.stroke({ color: GARDEN.marbleVein, width: 1, alpha: 0.6 });

    // Second vein
    floor.moveTo(-hw * 0.1, hh * 0.3 + veinOffset2 * hh);
    floor.quadraticCurveTo(hw * 0.2, 0, hw * 0.3, -hh * 0.4 + veinOffset1 * hh);
    floor.stroke({ color: GARDEN.marbleVein, width: 1.5, alpha: 0.4 });

    // Tile outline
    floor.poly([
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ]);
    floor.stroke({ color: 0xE0E0E0, width: 1 });

    // Shadow on floor (20% opacity)
    floor.poly([
      { x: -hw * 0.3, y: 0 },
      { x: 0, y: hh * 0.3 },
      { x: hw * 0.3, y: 0 },
      { x: 0, y: -hh * 0.3 },
    ]);
    floor.fill({ color: 0x000000, alpha: GARDEN.shadowAlpha });

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

    // Helper to draw roses on hedge face
    const drawRoses = (wall: Graphics, startX: number, startY: number, endX: number, endY: number, seed: number) => {
      const roseCount = 2 + (seed % 2);
      for (let i = 0; i < roseCount; i++) {
        const t = (i + 0.5) / roseCount + ((seed * (i + 1)) % 10) * 0.03;
        const rx = startX + (endX - startX) * t;
        const ry = startY + (endY - startY) * t - wh * 0.4 - ((seed * i) % 5) * 2;

        // Rose petals
        wall.circle(rx, ry, 3);
        wall.fill({ color: GARDEN.roseRed });
        wall.circle(rx - 2, ry - 1, 2);
        wall.fill({ color: GARDEN.roseRed });
        wall.circle(rx + 2, ry - 1, 2);
        wall.fill({ color: GARDEN.roseRed });
        // Rose center
        wall.circle(rx, ry - 1, 1.5);
        wall.fill({ color: GARDEN.roseDark });
      }
    };

    // Top wall (blocks Y-1 movement) - NE edge - hedge
    if (cell.walls.top === true) {
      const wall = new Graphics();
      const seed = gridX * 11 + gridY * 17;

      // Hedge body (lighter green for top-facing)
      wall.moveTo(0, -hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, -hh / 2 - wh - 4, 0, -hh - wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeGreen });
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture bumps
      for (let i = 0; i < 3; i++) {
        const bx = hw * 0.2 + (i * hw * 0.25);
        const by = -hh / 2 + (i * hh * 0.15) - wh * 0.5;
        wall.circle(bx, by, 4);
        wall.fill({ color: GARDEN.hedgeLight });
      }

      // Roses
      drawRoses(wall, 0, -hh, hw, 0, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 10;
      this.staticContainer.addChild(wall);
    }

    // Left wall (blocks X-1 movement) - NW edge - hedge (darker side)
    if (cell.walls.left) {
      const wall = new Graphics();
      const seed = gridX * 13 + gridY * 19;

      wall.moveTo(-hw, 0);
      wall.lineTo(0, -hh);
      wall.lineTo(0, -hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, -hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeDark }); // Darker for depth
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.7 + (i * hw * 0.2);
        const by = -hh / 2 + (i * hh * 0.12) - wh * 0.5;
        wall.circle(bx, by, 3);
        wall.fill({ color: GARDEN.hedgeGreen });
      }

      // Roses
      drawRoses(wall, -hw, 0, 0, -hh, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 10;
      this.staticContainer.addChild(wall);
    }

    // Bottom wall (blocks Y+1 movement) - SW edge - hedge (darker side)
    if (cell.walls.bottom) {
      const wall = new Graphics();
      const seed = gridX * 23 + gridY * 29;

      wall.moveTo(-hw, 0);
      wall.lineTo(0, hh);
      wall.lineTo(0, hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeDark }); // Darker for depth
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.7 + (i * hw * 0.2);
        const by = hh / 2 - (i * hh * 0.12) - wh * 0.5;
        wall.circle(bx, by, 3);
        wall.fill({ color: GARDEN.hedgeGreen });
      }

      // Roses
      drawRoses(wall, -hw, 0, 0, hh, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY + 1) * 100 - 10;
      this.staticContainer.addChild(wall);
    }

    // Right wall (blocks X+1 movement) - SE edge - hedge
    if (cell.walls.right) {
      const wall = new Graphics();
      const seed = gridX * 31 + gridY * 37;

      wall.moveTo(0, hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, hh / 2 - wh - 4, 0, hh - wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeGreen });
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = hw * 0.2 + (i * hw * 0.25);
        const by = hh / 2 - (i * hh * 0.15) - wh * 0.5;
        wall.circle(bx, by, 4);
        wall.fill({ color: GARDEN.hedgeLight });
      }

      // Roses
      drawRoses(wall, 0, hh, hw, 0, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY + 1) * 100 - 10;
      this.staticContainer.addChild(wall);
    }

    // Corner connectors - hedge topiary spheres
    const pr = wh * 0.5;

    const drawHedgePillar = (corner: Graphics, px: number, py: number) => {
      // Base
      corner.circle(px, py, pr * 0.7);
      corner.fill({ color: GARDEN.hedgeDark });

      // Body (tapers up)
      corner.moveTo(px - pr * 0.6, py);
      corner.quadraticCurveTo(px - pr * 0.4, py - wh * 0.5, px - pr * 0.5, py - wh);
      corner.lineTo(px + pr * 0.5, py - wh);
      corner.quadraticCurveTo(px + pr * 0.4, py - wh * 0.5, px + pr * 0.6, py);
      corner.closePath();
      corner.fill({ color: GARDEN.hedgeGreen });
      corner.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Topiary ball on top
      corner.circle(px, py - wh - pr * 0.3, pr * 0.6);
      corner.fill({ color: GARDEN.hedgeGreen });
      corner.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Highlight
      corner.circle(px - pr * 0.2, py - wh - pr * 0.5, pr * 0.2);
      corner.fill({ color: GARDEN.hedgeLight });
    };

    // Top corner
    if (cell.walls.top || cell.walls.left) {
      const corner = new Graphics();
      drawHedgePillar(corner, 0, -hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY - 1) * 100 + 40;
      this.staticContainer.addChild(corner);
    }

    // Right corner
    if (cell.walls.top || cell.walls.right) {
      const corner = new Graphics();
      drawHedgePillar(corner, hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 40;
      this.staticContainer.addChild(corner);
    }

    // Left corner
    if (cell.walls.left || cell.walls.bottom) {
      const corner = new Graphics();
      drawHedgePillar(corner, -hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 40;
      this.staticContainer.addChild(corner);
    }

    // Bottom corner
    if (cell.walls.bottom || cell.walls.right) {
      const corner = new Graphics();
      drawHedgePillar(corner, 0, hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY + 1) * 100 + 40;
      this.staticContainer.addChild(corner);
    }
  }

  private drawExit(gridX: number, gridY: number): void {
    const { x, y } = this.toIso(gridX, gridY);
    const scale = this.tileWidth / 80;

    const exit = new Graphics();

    // Soft radial glow (pale yellow) - multiple layers for gradient effect
    exit.circle(0, -20 * scale, 50 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.15 });
    exit.circle(0, -20 * scale, 40 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.2 });
    exit.circle(0, -20 * scale, 30 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.25 });

    // Garden archway - hedge pillars
    exit.roundRect(-20 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Left pillar topiary ball
    exit.circle(-16 * scale, -58 * scale, 6 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    exit.roundRect(12 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right pillar topiary ball
    exit.circle(16 * scale, -58 * scale, 6 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Arch top (hedge)
    exit.arc(0, -55 * scale, 16 * scale, Math.PI, 0);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Garden gate opening (warm light inside)
    exit.roundRect(-12 * scale, -50 * scale, 24 * scale, 52 * scale, 6 * scale);
    exit.fill({ color: 0xFFFAE6 });

    // Soft inner glow
    exit.roundRect(-8 * scale, -45 * scale, 16 * scale, 45 * scale, 4 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.4 });

    // Roses on archway
    exit.circle(-18 * scale, -35 * scale, 3);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(-15 * scale, -25 * scale, 2.5);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(18 * scale, -40 * scale, 3);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(15 * scale, -30 * scale, 2.5);
    exit.fill({ color: GARDEN.roseRed });

    exit.x = x;
    exit.y = y;
    exit.zIndex = this.getDepth(gridX, gridY, 'sprite');
    this.staticContainer.addChild(exit);
  }

  private drawHUD(): void {
    const faceRadius = 28;
    const slotRadius = 16;
    const spacing = 12;

    // Gardener character face
    this.hudFace.clear();
    // Outer ring (hedge green border)
    this.hudFace.circle(faceRadius, faceRadius, faceRadius);
    this.hudFace.fill({ color: GARDEN.hedgeDark });
    this.hudFace.stroke({ color: GARDEN.outline, width: 3 });

    // Face background (peach skin)
    this.hudFace.circle(faceRadius, faceRadius + 4, faceRadius - 6);
    this.hudFace.fill({ color: GARDEN.skinPeach });

    // Eyes
    this.hudFace.circle(faceRadius - 7, faceRadius + 2, 3);
    this.hudFace.fill({ color: 0x2a2a2a });
    this.hudFace.circle(faceRadius + 7, faceRadius + 2, 3);
    this.hudFace.fill({ color: 0x2a2a2a });

    // Rosy cheeks
    this.hudFace.circle(faceRadius - 10, faceRadius + 8, 4);
    this.hudFace.fill({ color: 0xFFB6A3, alpha: 0.5 });
    this.hudFace.circle(faceRadius + 10, faceRadius + 8, 4);
    this.hudFace.fill({ color: 0xFFB6A3, alpha: 0.5 });

    // Smile
    this.hudFace.moveTo(faceRadius - 6, faceRadius + 10);
    this.hudFace.quadraticCurveTo(faceRadius, faceRadius + 16, faceRadius + 6, faceRadius + 10);
    this.hudFace.stroke({ color: 0x2a2a2a, width: 2 });

    // Straw hat
    this.hudFace.ellipse(faceRadius, faceRadius - 8, faceRadius - 2, 8);
    this.hudFace.fill({ color: GARDEN.strawHat });
    this.hudFace.stroke({ color: GARDEN.outline, width: 2 });
    // Hat crown
    this.hudFace.roundRect(faceRadius - 14, faceRadius - 20, 28, 14, 4);
    this.hudFace.fill({ color: GARDEN.strawHat });
    this.hudFace.stroke({ color: GARDEN.outline, width: 2 });
    // Hat band
    this.hudFace.roundRect(faceRadius - 14, faceRadius - 10, 28, 4, 1);
    this.hudFace.fill({ color: GARDEN.roseRed });

    // Inventory slot 1 (hammer)
    this.hudSlot1.clear();
    this.hudSlot1.x = faceRadius * 2 + spacing;
    this.hudSlot1.y = faceRadius - slotRadius;
    // Slot background
    this.hudSlot1.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot1.fill({ color: 0x2a2a2a });
    this.hudSlot1.stroke({ color: 0x4a4a4a, width: 2 });

    // Inventory slot 2 (cloak)
    this.hudSlot2.clear();
    this.hudSlot2.x = faceRadius * 2 + spacing + slotRadius * 2 + spacing;
    this.hudSlot2.y = faceRadius - slotRadius;
    // Slot background
    this.hudSlot2.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot2.fill({ color: 0x2a2a2a });
    this.hudSlot2.stroke({ color: 0x4a4a4a, width: 2 });

    // Inventory slot 3 (big torch)
    this.hudSlot3.clear();
    this.hudSlot3.x = faceRadius * 2 + spacing + (slotRadius * 2 + spacing) * 2;
    this.hudSlot3.y = faceRadius - slotRadius;
    // Slot background
    this.hudSlot3.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot3.fill({ color: 0x2a2a2a });
    this.hudSlot3.stroke({ color: 0x4a4a4a, width: 2 });

    // Inventory slot 4 (ice shard)
    this.hudSlot4.clear();
    this.hudSlot4.x = faceRadius * 2 + spacing + (slotRadius * 2 + spacing) * 3;
    this.hudSlot4.y = faceRadius - slotRadius;
    // Slot background
    this.hudSlot4.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot4.fill({ color: 0x2a2a2a });
    this.hudSlot4.stroke({ color: 0x4a4a4a, width: 2 });

    this.updateHUD();
  }

  private updateHUD(): void {
    const slotRadius = 16;

    // Update slot 1 (hammer)
    this.hudSlot1.clear();
    this.hudSlot1.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot1.fill({ color: 0x2a2a2a });
    this.hudSlot1.stroke({ color: this.player.hasHammer ? 0x88ccff : 0x4a4a4a, width: 2 });

    if (this.player.hasHammer) {
      // Draw mini hammer icon
      this.hudSlot1.roundRect(slotRadius - 2, slotRadius - 8, 4, 14, 1);
      this.hudSlot1.fill({ color: 0x8b4513 });
      this.hudSlot1.roundRect(slotRadius - 6, slotRadius - 10, 12, 5, 2);
      this.hudSlot1.fill({ color: 0x666666 });
    }

    // Update slot 2 (cloak/invisibility)
    this.hudSlot2.clear();
    this.hudSlot2.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot2.fill({ color: 0x2a2a2a });
    this.hudSlot2.stroke({ color: this.invisibility.active ? 0xaa66ff : 0x4a4a4a, width: 2 });

    if (this.invisibility.active) {
      // Draw mini cloak icon with timer indication
      const timeLeft = Math.max(0, this.invisibility.endTime - Date.now());
      const progress = timeLeft / 10000; // 0 to 1

      // Purple glow based on time remaining
      this.hudSlot2.circle(slotRadius, slotRadius, slotRadius - 3);
      this.hudSlot2.fill({ color: 0x6633aa, alpha: progress * 0.5 });

      // Cloak shape
      this.hudSlot2.moveTo(slotRadius, slotRadius - 8);
      this.hudSlot2.quadraticCurveTo(slotRadius - 6, slotRadius - 4, slotRadius - 5, slotRadius + 6);
      this.hudSlot2.quadraticCurveTo(slotRadius, slotRadius + 8, slotRadius + 5, slotRadius + 6);
      this.hudSlot2.quadraticCurveTo(slotRadius + 6, slotRadius - 4, slotRadius, slotRadius - 8);
      this.hudSlot2.fill({ color: 0x8844cc });
    }

    // Update slot 3 (big torch/extended vision)
    this.hudSlot3.clear();
    this.hudSlot3.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot3.fill({ color: 0x2a2a2a });
    this.hudSlot3.stroke({ color: this.torchPower.active ? 0xffaa00 : 0x4a4a4a, width: 2 });

    if (this.torchPower.active) {
      // Draw mini torch icon with timer indication
      const timeLeft = Math.max(0, this.torchPower.endTime - Date.now());
      const progress = timeLeft / 10000; // 0 to 1

      // Orange glow based on time remaining
      this.hudSlot3.circle(slotRadius, slotRadius, slotRadius - 3);
      this.hudSlot3.fill({ color: 0xff6600, alpha: progress * 0.5 });

      // Torch handle
      this.hudSlot3.roundRect(slotRadius - 2, slotRadius - 4, 4, 12, 1);
      this.hudSlot3.fill({ color: 0x6b3a1a });

      // Flame
      this.hudSlot3.ellipse(slotRadius, slotRadius - 8, 5, 7);
      this.hudSlot3.fill({ color: 0xff6600 });
      this.hudSlot3.ellipse(slotRadius, slotRadius - 9, 3, 5);
      this.hudSlot3.fill({ color: 0xffaa00 });
    }

    // Update slot 4 (ice shard)
    this.hudSlot4.clear();
    this.hudSlot4.circle(slotRadius, slotRadius, slotRadius);
    this.hudSlot4.fill({ color: 0x2a2a2a });
    this.hudSlot4.stroke({ color: this.player.hasIce ? 0x66ccff : 0x4a4a4a, width: 2 });

    if (this.player.hasIce) {
      // Draw mini ice shard icon
      this.hudSlot4.moveTo(slotRadius, slotRadius - 10);
      this.hudSlot4.lineTo(slotRadius - 5, slotRadius);
      this.hudSlot4.lineTo(slotRadius - 3, slotRadius + 6);
      this.hudSlot4.lineTo(slotRadius + 3, slotRadius + 6);
      this.hudSlot4.lineTo(slotRadius + 5, slotRadius);
      this.hudSlot4.closePath();
      this.hudSlot4.fill({ color: 0x66ccff });

      // Highlight
      this.hudSlot4.circle(slotRadius, slotRadius - 6, 2);
      this.hudSlot4.fill({ color: 0xffffff, alpha: 0.8 });
    }
  }
}
