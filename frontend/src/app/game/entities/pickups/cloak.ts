import { GameContext } from '../../game-context';
import { BasePickup, SparkleConfig } from '../base-pickup';

/**
 * Cloak pickup - grants temporary invisibility (10 seconds)
 */
export class CloakPickup extends BasePickup {
  constructor(context: GameContext) {
    super(context);
  }

  protected getSparkleConfig(): SparkleConfig {
    return {
      color: 0xaa66ff,
      alpha: 0.8,
      radius: 2,
      speed: 0.4,
      maxHeight: 50,
      xOffsets: [-10, -4, 2, 8, 14],
    };
  }

  protected drawGraphics(scale: number): void {
    // Purple magical glow
    this.graphics.circle(0, -15 * scale, 22 * scale);
    this.graphics.fill({ color: 0x8844cc, alpha: 0.3 });

    // Cloak body (flowing shape)
    this.graphics.moveTo(0, -35 * scale);
    this.graphics.quadraticCurveTo(-15 * scale, -30 * scale, -12 * scale, -10 * scale);
    this.graphics.quadraticCurveTo(-10 * scale, 0, -8 * scale, 5 * scale);
    this.graphics.quadraticCurveTo(0, 8 * scale, 8 * scale, 5 * scale);
    this.graphics.quadraticCurveTo(10 * scale, 0, 12 * scale, -10 * scale);
    this.graphics.quadraticCurveTo(15 * scale, -30 * scale, 0, -35 * scale);
    this.graphics.fill({ color: 0x6633aa });

    // Cloak inner (darker)
    this.graphics.moveTo(0, -30 * scale);
    this.graphics.quadraticCurveTo(-8 * scale, -25 * scale, -6 * scale, -10 * scale);
    this.graphics.quadraticCurveTo(-4 * scale, 0, 0, 2 * scale);
    this.graphics.quadraticCurveTo(4 * scale, 0, 6 * scale, -10 * scale);
    this.graphics.quadraticCurveTo(8 * scale, -25 * scale, 0, -30 * scale);
    this.graphics.fill({ color: 0x442288 });

    // Hood
    this.graphics.ellipse(0, -32 * scale, 8 * scale, 6 * scale);
    this.graphics.fill({ color: 0x5522aa });

    // Mysterious eye symbols
    this.graphics.circle(-3 * scale, -18 * scale, 2 * scale);
    this.graphics.fill({ color: 0xaa88ff, alpha: 0.6 });
    this.graphics.circle(3 * scale, -18 * scale, 2 * scale);
    this.graphics.fill({ color: 0xaa88ff, alpha: 0.6 });
  }
}
