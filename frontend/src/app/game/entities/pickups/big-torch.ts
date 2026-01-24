import { GameContext } from '../../game-context';
import { BasePickup, SparkleConfig } from '../base-pickup';

/**
 * Big Torch pickup - grants expanded vision radius (10 seconds)
 */
export class BigTorchPickup extends BasePickup {
  constructor(context: GameContext) {
    super(context);
  }

  protected getSparkleConfig(): SparkleConfig {
    return {
      color: 0xffaa00,
      alpha: 0.9,
      radius: 3,
      speed: 0.6,
      maxHeight: 55,
      xOffsets: [-8, -3, 2, 7, 12],
    };
  }

  protected override getSparkleYOffset(): number {
    return 20; // Start sparkles higher due to flame
  }

  protected drawGraphics(scale: number): void {
    // Warm orange/yellow magical glow
    this.graphics.circle(0, -25 * scale, 28 * scale);
    this.graphics.fill({ color: 0xff8800, alpha: 0.3 });

    // Large torch handle (wooden, thick)
    this.graphics.roundRect(-4 * scale, -30 * scale, 8 * scale, 35 * scale, 3 * scale);
    this.graphics.fill({ color: 0x6b3a1a });

    // Handle wrap (decorative bands)
    this.graphics.roundRect(-5 * scale, -10 * scale, 10 * scale, 4 * scale, 2 * scale);
    this.graphics.fill({ color: 0x8b5a2b });
    this.graphics.roundRect(-5 * scale, -20 * scale, 10 * scale, 4 * scale, 2 * scale);
    this.graphics.fill({ color: 0x8b5a2b });

    // Torch head (metal bracket)
    this.graphics.roundRect(-8 * scale, -38 * scale, 16 * scale, 10 * scale, 3 * scale);
    this.graphics.fill({ color: 0x555555 });

    // Large flame (outer - orange)
    this.graphics.ellipse(0, -50 * scale, 12 * scale, 18 * scale);
    this.graphics.fill({ color: 0xff6600 });

    // Medium flame (yellow)
    this.graphics.ellipse(0, -52 * scale, 8 * scale, 14 * scale);
    this.graphics.fill({ color: 0xffaa00 });

    // Inner flame (bright yellow/white)
    this.graphics.ellipse(0, -54 * scale, 4 * scale, 10 * scale);
    this.graphics.fill({ color: 0xffdd44 });
  }
}
