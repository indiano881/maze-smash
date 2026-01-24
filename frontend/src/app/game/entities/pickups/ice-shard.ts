import { Graphics } from 'pixi.js';
import { GameContext } from '../../game-context';
import { BasePickup, SparkleConfig } from '../base-pickup';

/**
 * Ice projectile state
 */
export interface IceProjectileState {
  active: boolean;
  x: number;
  y: number;
  visualX: number;
  visualY: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

/**
 * Ice Shard pickup - can be shot as a projectile (press Q)
 */
export class IceShardPickup extends BasePickup {
  private projectileGraphics: Graphics;
  private projectileState: IceProjectileState = {
    active: false,
    x: 0,
    y: 0,
    visualX: 0,
    visualY: 0,
    direction: 'down',
  };

  constructor(context: GameContext) {
    super(context);

    // Create projectile graphics
    this.projectileGraphics = new Graphics();
    this.projectileGraphics.visible = false;
    context.staticContainer.addChild(this.projectileGraphics);
  }

  protected getSparkleConfig(): SparkleConfig {
    return {
      color: 0x88ddff,
      alpha: 0.9,
      radius: 2,
      speed: 0.5,
      maxHeight: 45,
      xOffsets: [-10, -4, 2, 8, 12],
    };
  }

  protected override getSparkleYOffset(): number {
    return 10;
  }

  protected drawGraphics(scale: number): void {
    // Cyan/blue magical glow
    this.graphics.circle(0, -20 * scale, 25 * scale);
    this.graphics.fill({ color: 0x44aaff, alpha: 0.3 });

    // Main ice crystal (pointed shard shape)
    this.graphics.moveTo(0, -45 * scale);
    this.graphics.lineTo(-10 * scale, -20 * scale);
    this.graphics.lineTo(-6 * scale, 0);
    this.graphics.lineTo(6 * scale, 0);
    this.graphics.lineTo(10 * scale, -20 * scale);
    this.graphics.closePath();
    this.graphics.fill({ color: 0x66ccff });

    // Inner crystal facet (lighter)
    this.graphics.moveTo(0, -40 * scale);
    this.graphics.lineTo(-5 * scale, -20 * scale);
    this.graphics.lineTo(0, -5 * scale);
    this.graphics.lineTo(5 * scale, -20 * scale);
    this.graphics.closePath();
    this.graphics.fill({ color: 0x99ddff });

    // Highlight streak
    this.graphics.moveTo(-2 * scale, -35 * scale);
    this.graphics.lineTo(-1 * scale, -15 * scale);
    this.graphics.lineTo(1 * scale, -15 * scale);
    this.graphics.lineTo(2 * scale, -35 * scale);
    this.graphics.closePath();
    this.graphics.fill({ color: 0xffffff, alpha: 0.6 });

    // Bright tip
    this.graphics.circle(0, -42 * scale, 3 * scale);
    this.graphics.fill({ color: 0xffffff, alpha: 0.8 });
  }

  /**
   * Reset also resets projectile state
   */
  override reset(x: number, y: number): void {
    super.reset(x, y);
    this.projectileState = {
      active: false,
      x: 0,
      y: 0,
      visualX: 0,
      visualY: 0,
      direction: 'down',
    };
    this.projectileGraphics.visible = false;
  }

  /**
   * Shoot the ice projectile from player position
   */
  shoot(playerX: number, playerY: number, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (this.projectileState.active) return false;

    this.projectileState.active = true;
    this.projectileState.x = playerX;
    this.projectileState.y = playerY;
    this.projectileState.visualX = playerX;
    this.projectileState.visualY = playerY;
    this.projectileState.direction = direction;

    this.drawProjectile();
    return true;
  }

  /**
   * Update projectile movement (call each frame)
   */
  updateProjectile(): void {
    if (!this.projectileState.active) {
      this.projectileGraphics.visible = false;
      return;
    }

    const speed = 0.15; // Constant speed per frame (tiles per frame)

    // Move projectile at constant speed in its direction
    switch (this.projectileState.direction) {
      case 'up':
        this.projectileState.visualY -= speed;
        break;
      case 'down':
        this.projectileState.visualY += speed;
        break;
      case 'left':
        this.projectileState.visualX -= speed;
        break;
      case 'right':
        this.projectileState.visualX += speed;
        break;
    }

    // Check if projectile has reached or passed the target cell
    const reachedTarget =
      (this.projectileState.direction === 'up' &&
        this.projectileState.visualY <= this.projectileState.y) ||
      (this.projectileState.direction === 'down' &&
        this.projectileState.visualY >= this.projectileState.y) ||
      (this.projectileState.direction === 'left' &&
        this.projectileState.visualX <= this.projectileState.x) ||
      (this.projectileState.direction === 'right' &&
        this.projectileState.visualX >= this.projectileState.x);

    if (reachedTarget) {
      // Snap to target cell
      this.projectileState.visualX = this.projectileState.x;
      this.projectileState.visualY = this.projectileState.y;

      // Calculate next cell based on direction
      let nextX = this.projectileState.x;
      let nextY = this.projectileState.y;
      switch (this.projectileState.direction) {
        case 'up':
          nextY--;
          break;
        case 'down':
          nextY++;
          break;
        case 'left':
          nextX--;
          break;
        case 'right':
          nextX++;
          break;
      }

      // Check bounds first
      if (
        nextX < 0 ||
        nextX >= this.context.mazeWidth ||
        nextY < 0 ||
        nextY >= this.context.mazeHeight
      ) {
        this.projectileState.active = false;
        this.projectileGraphics.visible = false;
        return;
      }

      // Check if projectile can continue (no wall blocking)
      if (
        this.context.maze.canMove(
          this.projectileState.x,
          this.projectileState.y,
          nextX,
          nextY
        )
      ) {
        this.projectileState.x = nextX;
        this.projectileState.y = nextY;
      } else {
        // Hit a wall - projectile stops
        this.projectileState.active = false;
        this.projectileGraphics.visible = false;
        return;
      }
    }

    // Update projectile visual position
    const { x, y } = this.context.toIso(
      this.projectileState.visualX,
      this.projectileState.visualY
    );
    this.projectileGraphics.x = x;
    this.projectileGraphics.y = y;
    this.projectileGraphics.zIndex =
      (Math.round(this.projectileState.visualX) +
        Math.round(this.projectileState.visualY)) *
        100 +
      50;
    this.projectileGraphics.visible = true;
  }

  private drawProjectile(): void {
    const scale = this.context.tileWidth / 80;

    this.projectileGraphics.clear();

    // Glow
    this.projectileGraphics.circle(0, -10 * scale, 15 * scale);
    this.projectileGraphics.fill({ color: 0x88ddff, alpha: 0.4 });

    // Ice crystal shape (pointed shard)
    this.projectileGraphics.moveTo(0, -25 * scale);
    this.projectileGraphics.lineTo(-8 * scale, -5 * scale);
    this.projectileGraphics.lineTo(-4 * scale, 5 * scale);
    this.projectileGraphics.lineTo(4 * scale, 5 * scale);
    this.projectileGraphics.lineTo(8 * scale, -5 * scale);
    this.projectileGraphics.closePath();
    this.projectileGraphics.fill({ color: 0x66ccff });

    // Inner highlight
    this.projectileGraphics.moveTo(0, -20 * scale);
    this.projectileGraphics.lineTo(-4 * scale, -5 * scale);
    this.projectileGraphics.lineTo(0, 0);
    this.projectileGraphics.lineTo(4 * scale, -5 * scale);
    this.projectileGraphics.closePath();
    this.projectileGraphics.fill({ color: 0xaaeeff });

    // Bright center
    this.projectileGraphics.circle(0, -10 * scale, 3 * scale);
    this.projectileGraphics.fill({ color: 0xffffff, alpha: 0.8 });
  }

  /**
   * Check if projectile is currently active
   */
  isProjectileActive(): boolean {
    return this.projectileState.active;
  }

  /**
   * Get projectile graphics (for container management)
   */
  getProjectileGraphics(): Graphics {
    return this.projectileGraphics;
  }

  /**
   * Get current projectile state
   */
  getProjectileState(): IceProjectileState {
    return this.projectileState;
  }
}
