import { Container, Graphics } from 'pixi.js';
import { GameContext } from '../game-context';

/**
 * Sparkle configuration for pickup visual effects
 */
export interface SparkleConfig {
  color: number;
  alpha: number;
  radius: number;
  speed: number;
  maxHeight: number;
  xOffsets: number[];
}

/**
 * Abstract base class for all pickup items in the game.
 * Handles common functionality: positioning, visibility, sparkle animations.
 */
export abstract class BasePickup {
  protected graphics: Graphics;
  protected sparkles: Graphics[] = [];
  protected sparkleOffsets: number[] = [];
  protected context: GameContext;

  /** Grid position */
  x = 0;
  y = 0;

  /** Whether this pickup has been collected */
  pickedUp = false;

  constructor(context: GameContext) {
    this.context = context;

    // Create main graphics object
    this.graphics = new Graphics();
    context.staticContainer.addChild(this.graphics);

    // Create sparkle particles
    const config = this.getSparkleConfig();
    for (let i = 0; i < 5; i++) {
      const sparkle = new Graphics();
      sparkle.circle(0, 0, config.radius);
      sparkle.fill({ color: config.color, alpha: config.alpha });
      this.sparkles.push(sparkle);
      this.sparkleOffsets.push(Math.random() * config.maxHeight);
      context.staticContainer.addChild(sparkle);
    }
  }

  /**
   * Subclasses define their sparkle visual style
   */
  protected abstract getSparkleConfig(): SparkleConfig;

  /**
   * Subclasses implement their specific graphics drawing
   */
  protected abstract drawGraphics(scale: number): void;

  /**
   * Reset pickup to a new position
   */
  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.pickedUp = false;
    this.resetSparkleOffsets();
    this.draw();
    this.updateVisibility();
  }

  /**
   * Reset sparkle animation offsets to random values
   */
  resetSparkleOffsets(): void {
    const config = this.getSparkleConfig();
    for (let i = 0; i < this.sparkleOffsets.length; i++) {
      this.sparkleOffsets[i] = Math.random() * config.maxHeight;
    }
  }

  /**
   * Draw the pickup graphics at current position
   */
  draw(): void {
    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;

    this.graphics.clear();
    this.drawGraphics(scale);

    this.graphics.x = x;
    this.graphics.y = y;
    this.graphics.zIndex = (this.x + this.y) * 100 + 20;
    this.graphics.visible = !this.pickedUp;
  }

  /**
   * Update visibility based on pickedUp state
   */
  updateVisibility(): void {
    this.graphics.visible = !this.pickedUp;
  }

  /**
   * Animate sparkles floating upward (call each frame)
   */
  animateSparkles(): void {
    if (this.pickedUp) {
      this.sparkles.forEach((s) => (s.visible = false));
      return;
    }

    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;
    const config = this.getSparkleConfig();

    this.sparkles.forEach((sparkle, i) => {
      // Move sparkle upward
      this.sparkleOffsets[i] += config.speed;

      // Reset to bottom when reaching top
      if (this.sparkleOffsets[i] > config.maxHeight) {
        this.sparkleOffsets[i] = 0;
      }

      // Position sparkle
      sparkle.x = x + config.xOffsets[i] * scale;
      sparkle.y = y - this.sparkleOffsets[i] * scale - this.getSparkleYOffset() * scale;
      sparkle.zIndex = (this.x + this.y) * 100 + 25;
      sparkle.visible = true;

      // Fade based on position (fade out at top)
      sparkle.alpha = 1 - (this.sparkleOffsets[i] / config.maxHeight) * 0.7;
    });
  }

  /**
   * Y offset for sparkle start position (override for different pickup heights)
   */
  protected getSparkleYOffset(): number {
    return 0;
  }

  /**
   * Get main graphics object (for container management)
   */
  getGraphics(): Graphics {
    return this.graphics;
  }

  /**
   * Get all sparkle graphics objects (for container management)
   */
  getSparkles(): Graphics[] {
    return this.sparkles;
  }
}
