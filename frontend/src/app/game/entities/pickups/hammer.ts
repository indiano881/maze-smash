import { GameContext } from '../../game-context';
import { BasePickup, SparkleConfig } from '../base-pickup';

/**
 * Hammer pickup - allows player to smash one wall
 */
export class HammerPickup extends BasePickup {
  constructor(context: GameContext) {
    super(context);
  }

  protected getSparkleConfig(): SparkleConfig {
    return {
      color: 0xffffff,
      alpha: 0.8,
      radius: 2,
      speed: 0.5,
      maxHeight: 45,
      xOffsets: [-12, -5, 0, 7, 14],
    };
  }

  protected drawGraphics(scale: number): void {
    // Glow effect
    this.graphics.circle(0, -15 * scale, 20 * scale);
    this.graphics.fill({ color: 0x88ccff, alpha: 0.3 });

    // Hammer handle (wooden)
    this.graphics.roundRect(-2 * scale, -20 * scale, 4 * scale, 25 * scale, 2 * scale);
    this.graphics.fill({ color: 0x8b4513 });

    // Hammer head (metal) - sits on top of handle
    this.graphics.roundRect(-10 * scale, -28 * scale, 20 * scale, 10 * scale, 3 * scale);
    this.graphics.fill({ color: 0x666666 });

    // Hammer head highlight
    this.graphics.roundRect(-8 * scale, -26 * scale, 16 * scale, 3 * scale, 2 * scale);
    this.graphics.fill({ color: 0x888888 });
  }
}
