import { Graphics } from 'pixi.js';
import { GameContext, GARDEN } from '../game-context';

/**
 * Opponent entity - another player in the game (rendered with red overalls)
 */
export class Opponent {
  private graphics: Graphics;
  private context: GameContext;

  /** Player ID from server */
  id: string = '';

  /** Grid position */
  x = 0;
  y = 0;

  /** Visual position (for smooth animation) */
  visualX = 0;
  visualY = 0;

  /** Is this opponent currently active/visible */
  active = false;

  // Red color scheme for opponent
  private readonly OPPONENT_COLORS = {
    overallsRed: 0xc44536,
    overallsDark: 0x9a3428,
    hatBand: 0x4a7cb0, // Blue band (opposite of player)
  };

  constructor(context: GameContext) {
    this.context = context;
    this.graphics = new Graphics();
    this.graphics.visible = false;
    context.staticContainer.addChild(this.graphics);
  }

  /**
   * Update opponent position from server data
   */
  update(id: string, x: number, y: number): void {
    // If this is a new opponent or first update, snap to position
    if (!this.active || this.id !== id) {
      this.visualX = x;
      this.visualY = y;
    }

    this.id = id;
    this.x = x;
    this.y = y;
    this.active = true;
    this.graphics.visible = true;
    this.updatePosition();
  }

  /**
   * Animate toward target position
   */
  updateAnimation(moveSpeed: number): void {
    if (!this.active) return;

    const dx = this.x - this.visualX;
    const dy = this.y - this.visualY;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      this.visualX += dx * moveSpeed;
      this.visualY += dy * moveSpeed;
    } else {
      this.visualX = this.x;
      this.visualY = this.y;
    }

    this.updatePosition();
  }

  /**
   * Update screen position
   */
  updatePosition(): void {
    const { x, y } = this.context.toIso(this.visualX, this.visualY);
    this.graphics.x = x;
    this.graphics.y = y;
    const cellX = Math.floor(this.visualX + 0.5);
    const cellY = Math.floor(this.visualY + 0.5);
    // +25 to appear slightly in front of player (+20) when overlapping
    this.graphics.zIndex = (cellX + cellY) * 100 + 25;
  }

  /**
   * Hide opponent (when they disconnect)
   */
  hide(): void {
    this.active = false;
    this.graphics.visible = false;
  }

  /**
   * Reset opponent state
   */
  reset(): void {
    this.id = '';
    this.x = 0;
    this.y = 0;
    this.visualX = 0;
    this.visualY = 0;
    this.active = false;
    this.graphics.visible = false;
  }

  /**
   * Draw opponent (red gardener)
   */
  draw(): void {
    const scale = this.context.tileWidth / 80;

    this.graphics.clear();

    if (!this.active) {
      return; // Don't draw if not active
    }

    // Shadow
    this.graphics.ellipse(0, 5 * scale, 15 * scale, 8 * scale);
    this.graphics.fill({ color: 0x000000, alpha: GARDEN.shadowAlpha });

    // Legs
    this.graphics.roundRect(-6 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsDark });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    this.graphics.roundRect(1 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsDark });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Red overalls body
    this.graphics.roundRect(-10 * scale, -22 * scale, 20 * scale, 22 * scale, 4 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsRed });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Overall straps
    this.graphics.roundRect(-8 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsRed });
    this.graphics.roundRect(4 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsRed });

    // Overall pocket
    this.graphics.roundRect(-4 * scale, -12 * scale, 8 * scale, 6 * scale, 2 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.overallsDark });

    // Arms (peach skin)
    this.graphics.roundRect(-14 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    this.graphics.roundRect(9 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Head
    this.graphics.circle(0, -32 * scale, 10 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Eyes (always facing down for simplicity)
    this.graphics.circle(-3 * scale, -31 * scale, 2 * scale);
    this.graphics.fill({ color: 0x2a2a2a });
    this.graphics.circle(3 * scale, -31 * scale, 2 * scale);
    this.graphics.fill({ color: 0x2a2a2a });

    // Rosy cheeks
    this.graphics.circle(-5 * scale, -29 * scale, 2 * scale);
    this.graphics.fill({ color: 0xffb6a3, alpha: 0.6 });
    this.graphics.circle(5 * scale, -29 * scale, 2 * scale);
    this.graphics.fill({ color: 0xffb6a3, alpha: 0.6 });

    // Straw hat
    this.graphics.ellipse(0, -40 * scale, 14 * scale, 5 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    this.graphics.ellipse(0, -44 * scale, 9 * scale, 6 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.roundRect(-9 * scale, -44 * scale, 18 * scale, 5 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Hat band (blue - opposite of player's red)
    this.graphics.roundRect(-9 * scale, -42 * scale, 18 * scale, 3 * scale, 1 * scale);
    this.graphics.fill({ color: this.OPPONENT_COLORS.hatBand });
  }

  getGraphics(): Graphics {
    return this.graphics;
  }
}
