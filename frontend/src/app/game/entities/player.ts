import { Graphics } from 'pixi.js';
import { GameContext, GARDEN } from '../game-context';

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Player entity - the gardener character controlled by the player
 */
export class Player {
  private graphics: Graphics;
  private context: GameContext;

  /** Grid position (target) */
  x = 0;
  y = 0;

  /** Visual position (animated) */
  visualX = 0;
  visualY = 0;

  /** Cell used for z-index (updates only when movement completes) */
  zCellX = 0;
  zCellY = 0;

  /** Last movement direction (for sprite facing) */
  direction: Direction = 'down';

  /** Inventory state */
  hasHammer = false;
  hasIce = false;

  constructor(context: GameContext) {
    this.context = context;
    this.graphics = new Graphics();
    context.staticContainer.addChild(this.graphics);
  }

  /**
   * Reset player to starting position
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.visualX = 0;
    this.visualY = 0;
    this.zCellX = 0;
    this.zCellY = 0;
    this.direction = 'down';
    this.hasHammer = false;
    this.hasIce = false;
    this.draw();
    this.updatePosition();
  }

  /**
   * Update visual position (lerp toward target - call each frame)
   * Returns true if still animating
   */
  updateAnimation(moveSpeed: number): boolean {
    const dx = this.x - this.visualX;
    const dy = this.y - this.visualY;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      this.visualX += dx * moveSpeed;
      this.visualY += dy * moveSpeed;
      this.updatePosition();
      return true;
    } else if (this.visualX !== this.x || this.visualY !== this.y) {
      // Snap to final position
      this.visualX = this.x;
      this.visualY = this.y;
      // Update z-index cell only when movement completes
      this.zCellX = this.x;
      this.zCellY = this.y;
      this.updatePosition();
      return false;
    }
    return false;
  }

  /**
   * Update graphics position on screen
   */
  updatePosition(): void {
    const { x, y } = this.context.toIso(this.visualX, this.visualY);
    this.graphics.x = x;
    this.graphics.y = y;
    // Z-index: use rounded cell position for depth sorting
    const cellX = Math.floor(this.visualX + 0.5);
    const cellY = Math.floor(this.visualY + 0.5);
    // Offset +20 keeps player behind front walls (+90) and side corners (+40)
    this.graphics.zIndex = (cellX + cellY) * 100 + 20;
  }

  /**
   * Draw player graphics (gardener character)
   */
  draw(): void {
    const scale = this.context.tileWidth / 80;

    this.graphics.clear();

    // Shadow (20% opacity)
    this.graphics.ellipse(0, 5 * scale, 15 * scale, 8 * scale);
    this.graphics.fill({ color: 0x000000, alpha: GARDEN.shadowAlpha });

    // Legs
    // Left leg
    this.graphics.roundRect(-6 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.overallsDark });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right leg
    this.graphics.roundRect(1 * scale, -2 * scale, 5 * scale, 10 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.overallsDark });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Blue overalls body
    this.graphics.roundRect(-10 * scale, -22 * scale, 20 * scale, 22 * scale, 4 * scale);
    this.graphics.fill({ color: GARDEN.overallsBlue });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Overall straps
    this.graphics.roundRect(-8 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.graphics.fill({ color: GARDEN.overallsBlue });
    this.graphics.roundRect(4 * scale, -26 * scale, 4 * scale, 8 * scale, 1 * scale);
    this.graphics.fill({ color: GARDEN.overallsBlue });

    // Overall pocket
    this.graphics.roundRect(-4 * scale, -12 * scale, 8 * scale, 6 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.overallsDark });

    // Arms (peach skin)
    // Left arm
    this.graphics.roundRect(-14 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right arm
    this.graphics.roundRect(9 * scale, -20 * scale, 5 * scale, 14 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Head (peach skin)
    this.graphics.circle(0, -32 * scale, 10 * scale);
    this.graphics.fill({ color: GARDEN.skinPeach });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Face direction handling
    let faceOffsetX = 0;
    switch (this.direction) {
      case 'left':
        faceOffsetX = -3;
        break;
      case 'right':
        faceOffsetX = 3;
        break;
    }

    // Eyes - positioned based on direction
    let eye1X = -3,
      eye1Y = -33;
    let eye2X = 3,
      eye2Y = -33;
    switch (this.direction) {
      case 'down':
        eye1X = -3;
        eye2X = 3;
        eye1Y = eye2Y = -31;
        break;
      case 'up':
        break; // No eyes visible
      case 'left':
        eye1X = eye2X = -5;
        eye1Y = -34;
        eye2Y = -30;
        break;
      case 'right':
        eye1X = eye2X = 5;
        eye1Y = -34;
        eye2Y = -30;
        break;
    }

    // Draw eyes (only visible when not facing away)
    if (this.direction !== 'up') {
      this.graphics.circle(eye1X * scale, eye1Y * scale, 2 * scale);
      this.graphics.fill({ color: 0x2a2a2a });
      this.graphics.circle(eye2X * scale, eye2Y * scale, 2 * scale);
      this.graphics.fill({ color: 0x2a2a2a });

      // Rosy cheeks
      this.graphics.circle((-5 + faceOffsetX) * scale, -29 * scale, 2 * scale);
      this.graphics.fill({ color: 0xffb6a3, alpha: 0.6 });
      this.graphics.circle((5 + faceOffsetX) * scale, -29 * scale, 2 * scale);
      this.graphics.fill({ color: 0xffb6a3, alpha: 0.6 });

      // Smile
      switch (this.direction) {
        case 'down':
          this.graphics.moveTo(-3 * scale, -28 * scale);
          this.graphics.quadraticCurveTo(0, -25 * scale, 3 * scale, -28 * scale);
          this.graphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
        case 'left':
          this.graphics.moveTo(-6 * scale, -28 * scale);
          this.graphics.quadraticCurveTo(-4 * scale, -26 * scale, -3 * scale, -28 * scale);
          this.graphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
        case 'right':
          this.graphics.moveTo(3 * scale, -28 * scale);
          this.graphics.quadraticCurveTo(4 * scale, -26 * scale, 6 * scale, -28 * scale);
          this.graphics.stroke({ color: GARDEN.outline, width: 1.5 * scale });
          break;
      }
    }

    // Straw hat
    // Hat brim
    this.graphics.ellipse(0, -40 * scale, 14 * scale, 5 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Hat crown
    this.graphics.ellipse(0, -44 * scale, 9 * scale, 6 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.roundRect(-9 * scale, -44 * scale, 18 * scale, 5 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.strawHat });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Hat band (red)
    this.graphics.roundRect(-9 * scale, -42 * scale, 18 * scale, 3 * scale, 1 * scale);
    this.graphics.fill({ color: GARDEN.roseRed });

    // Watering can in right hand
    // Can body
    this.graphics.roundRect(12 * scale, -18 * scale, 10 * scale, 12 * scale, 3 * scale);
    this.graphics.fill({ color: GARDEN.wateringCan });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Can spout
    this.graphics.moveTo(22 * scale, -16 * scale);
    this.graphics.lineTo(28 * scale, -22 * scale);
    this.graphics.lineTo(26 * scale, -24 * scale);
    this.graphics.lineTo(20 * scale, -18 * scale);
    this.graphics.closePath();
    this.graphics.fill({ color: GARDEN.wateringCan });
    this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Can handle
    this.graphics.moveTo(14 * scale, -18 * scale);
    this.graphics.quadraticCurveTo(10 * scale, -26 * scale, 14 * scale, -30 * scale);
    this.graphics.stroke({ color: GARDEN.wateringCanDark, width: 3 * scale });

    // Spout rose (water outlet)
    this.graphics.circle(27 * scale, -23 * scale, 2 * scale);
    this.graphics.fill({ color: GARDEN.wateringCanDark });

    // Hammer in left hand (if picked up) - now a garden trowel style
    if (this.hasHammer) {
      // Trowel handle
      this.graphics.roundRect(-20 * scale, -16 * scale, 4 * scale, 14 * scale, 2 * scale);
      this.graphics.fill({ color: 0x8b4513 });
      this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Trowel head
      this.graphics.moveTo(-22 * scale, -20 * scale);
      this.graphics.lineTo(-14 * scale, -20 * scale);
      this.graphics.lineTo(-18 * scale, -30 * scale);
      this.graphics.closePath();
      this.graphics.fill({ color: 0x888888 });
      this.graphics.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    }
  }

  /**
   * Set player alpha (for invisibility effect)
   */
  setAlpha(alpha: number): void {
    this.graphics.alpha = alpha;
  }

  /**
   * Get graphics (for container management)
   */
  getGraphics(): Graphics {
    return this.graphics;
  }
}
