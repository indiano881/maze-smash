import { Graphics } from 'pixi.js';
import { GameContext } from '../game-context';

/**
 * Flag entity - the objective the player must capture and bring to exit
 */
export class Flag {
  private graphics: Graphics;
  private context: GameContext;

  /** Grid position */
  x = 0;
  y = 0;

  /** Whether flag has been captured by player */
  captured = false;

  constructor(context: GameContext) {
    this.context = context;
    this.graphics = new Graphics();
    context.staticContainer.addChild(this.graphics);
  }

  /**
   * Reset flag to a new position
   */
  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.captured = false;
    this.draw();
    this.updateVisibility();
  }

  /**
   * Draw the flag graphics
   */
  draw(): void {
    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;

    this.graphics.clear();

    // Glow
    this.graphics.circle(0, 0, 25 * scale);
    this.graphics.fill({ color: 0xffd700, alpha: 0.2 });

    // Pole (rounded with caps)
    this.graphics.roundRect(-2 * scale, -40 * scale, 4 * scale, 45 * scale, 2 * scale);
    this.graphics.fill({ color: 0x8b4513 });
    // Pole cap (ornament at top)
    this.graphics.circle(0, -42 * scale, 3 * scale);
    this.graphics.fill({ color: 0xdaa520 });

    // Flag cloth (wavy banner)
    this.graphics.moveTo(2 * scale, -40 * scale);
    this.graphics.quadraticCurveTo(15 * scale, -42 * scale, 25 * scale, -35 * scale);
    this.graphics.quadraticCurveTo(22 * scale, -29 * scale, 27 * scale, -25 * scale);
    this.graphics.quadraticCurveTo(22 * scale, -21 * scale, 25 * scale, -18 * scale);
    this.graphics.quadraticCurveTo(15 * scale, -16 * scale, 2 * scale, -18 * scale);
    this.graphics.lineTo(2 * scale, -40 * scale);
    this.graphics.fill({ color: 0xcc0000 });

    this.graphics.x = x;
    this.graphics.y = y;
    this.graphics.zIndex = (this.x + this.y) * 100 + 20;
    this.graphics.visible = !this.captured;
  }

  /**
   * Update visibility based on captured state
   */
  updateVisibility(): void {
    this.graphics.visible = !this.captured;
  }

  /**
   * Get graphics object (for container management)
   */
  getGraphics(): Graphics {
    return this.graphics;
  }
}
