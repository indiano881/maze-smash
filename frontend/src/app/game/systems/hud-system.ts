import { Container, Graphics } from 'pixi.js';
import { GARDEN } from '../game-context';

/**
 * HUD state for updating display
 */
export interface HUDState {
  hasHammer: boolean;
  hasIce: boolean;
  invisibilityActive: boolean;
  invisibilityEndTime: number;
  torchActive: boolean;
  torchEndTime: number;
}

/**
 * HUD System - renders player face and inventory slots
 */
export class HUDSystem {
  private container: Container;
  private face: Graphics;
  private slot1: Graphics; // hammer
  private slot2: Graphics; // cloak/invisibility
  private slot3: Graphics; // big torch
  private slot4: Graphics; // ice shard

  private readonly faceRadius = 28;
  private readonly slotRadius = 16;
  private readonly spacing = 12;

  constructor(stage: Container) {
    // HUD container (fixed position, not affected by game camera)
    this.container = new Container();
    this.container.x = 20;
    this.container.y = 20;
    stage.addChild(this.container);

    // Character face circle
    this.face = new Graphics();
    this.container.addChild(this.face);

    // Inventory slots
    this.slot1 = new Graphics();
    this.container.addChild(this.slot1);

    this.slot2 = new Graphics();
    this.container.addChild(this.slot2);

    this.slot3 = new Graphics();
    this.container.addChild(this.slot3);

    this.slot4 = new Graphics();
    this.container.addChild(this.slot4);

    this.drawStaticElements();
  }

  /**
   * Draw static HUD elements (face and slot backgrounds)
   */
  private drawStaticElements(): void {
    const { faceRadius, slotRadius, spacing } = this;

    // Gardener character face
    this.face.clear();
    // Outer ring (hedge green border)
    this.face.circle(faceRadius, faceRadius, faceRadius);
    this.face.fill({ color: GARDEN.hedgeDark });
    this.face.stroke({ color: GARDEN.outline, width: 3 });

    // Face background (peach skin)
    this.face.circle(faceRadius, faceRadius + 4, faceRadius - 6);
    this.face.fill({ color: GARDEN.skinPeach });

    // Eyes
    this.face.circle(faceRadius - 7, faceRadius + 2, 3);
    this.face.fill({ color: 0x2a2a2a });
    this.face.circle(faceRadius + 7, faceRadius + 2, 3);
    this.face.fill({ color: 0x2a2a2a });

    // Rosy cheeks
    this.face.circle(faceRadius - 10, faceRadius + 8, 4);
    this.face.fill({ color: 0xffb6a3, alpha: 0.5 });
    this.face.circle(faceRadius + 10, faceRadius + 8, 4);
    this.face.fill({ color: 0xffb6a3, alpha: 0.5 });

    // Smile
    this.face.moveTo(faceRadius - 6, faceRadius + 10);
    this.face.quadraticCurveTo(faceRadius, faceRadius + 16, faceRadius + 6, faceRadius + 10);
    this.face.stroke({ color: 0x2a2a2a, width: 2 });

    // Straw hat
    this.face.ellipse(faceRadius, faceRadius - 8, faceRadius - 2, 8);
    this.face.fill({ color: GARDEN.strawHat });
    this.face.stroke({ color: GARDEN.outline, width: 2 });
    // Hat crown
    this.face.roundRect(faceRadius - 14, faceRadius - 20, 28, 14, 4);
    this.face.fill({ color: GARDEN.strawHat });
    this.face.stroke({ color: GARDEN.outline, width: 2 });
    // Hat band
    this.face.roundRect(faceRadius - 14, faceRadius - 10, 28, 4, 1);
    this.face.fill({ color: GARDEN.roseRed });

    // Position inventory slots
    this.slot1.x = faceRadius * 2 + spacing;
    this.slot1.y = faceRadius - slotRadius;

    this.slot2.x = faceRadius * 2 + spacing + slotRadius * 2 + spacing;
    this.slot2.y = faceRadius - slotRadius;

    this.slot3.x = faceRadius * 2 + spacing + (slotRadius * 2 + spacing) * 2;
    this.slot3.y = faceRadius - slotRadius;

    this.slot4.x = faceRadius * 2 + spacing + (slotRadius * 2 + spacing) * 3;
    this.slot4.y = faceRadius - slotRadius;
  }

  /**
   * Update HUD with current game state
   */
  update(state: HUDState): void {
    const { slotRadius } = this;

    // Update slot 1 (hammer)
    this.slot1.clear();
    this.slot1.circle(slotRadius, slotRadius, slotRadius);
    this.slot1.fill({ color: 0x2a2a2a });
    this.slot1.stroke({ color: state.hasHammer ? 0x88ccff : 0x4a4a4a, width: 2 });

    if (state.hasHammer) {
      // Draw mini hammer icon
      this.slot1.roundRect(slotRadius - 2, slotRadius - 8, 4, 14, 1);
      this.slot1.fill({ color: 0x8b4513 });
      this.slot1.roundRect(slotRadius - 6, slotRadius - 10, 12, 5, 2);
      this.slot1.fill({ color: 0x666666 });
    }

    // Update slot 2 (cloak/invisibility)
    this.slot2.clear();
    this.slot2.circle(slotRadius, slotRadius, slotRadius);
    this.slot2.fill({ color: 0x2a2a2a });
    this.slot2.stroke({ color: state.invisibilityActive ? 0xaa66ff : 0x4a4a4a, width: 2 });

    if (state.invisibilityActive) {
      // Draw mini cloak icon with timer indication
      const timeLeft = Math.max(0, state.invisibilityEndTime - Date.now());
      const progress = timeLeft / 10000; // 0 to 1

      // Purple glow based on time remaining
      this.slot2.circle(slotRadius, slotRadius, slotRadius - 3);
      this.slot2.fill({ color: 0x6633aa, alpha: progress * 0.5 });

      // Cloak shape
      this.slot2.moveTo(slotRadius, slotRadius - 8);
      this.slot2.quadraticCurveTo(slotRadius - 6, slotRadius - 4, slotRadius - 5, slotRadius + 6);
      this.slot2.quadraticCurveTo(slotRadius, slotRadius + 8, slotRadius + 5, slotRadius + 6);
      this.slot2.quadraticCurveTo(slotRadius + 6, slotRadius - 4, slotRadius, slotRadius - 8);
      this.slot2.fill({ color: 0x8844cc });
    }

    // Update slot 3 (big torch/extended vision)
    this.slot3.clear();
    this.slot3.circle(slotRadius, slotRadius, slotRadius);
    this.slot3.fill({ color: 0x2a2a2a });
    this.slot3.stroke({ color: state.torchActive ? 0xffaa00 : 0x4a4a4a, width: 2 });

    if (state.torchActive) {
      // Draw mini torch icon with timer indication
      const timeLeft = Math.max(0, state.torchEndTime - Date.now());
      const progress = timeLeft / 10000; // 0 to 1

      // Orange glow based on time remaining
      this.slot3.circle(slotRadius, slotRadius, slotRadius - 3);
      this.slot3.fill({ color: 0xff6600, alpha: progress * 0.5 });

      // Torch handle
      this.slot3.roundRect(slotRadius - 2, slotRadius - 4, 4, 12, 1);
      this.slot3.fill({ color: 0x6b3a1a });

      // Flame
      this.slot3.ellipse(slotRadius, slotRadius - 8, 5, 7);
      this.slot3.fill({ color: 0xff6600 });
      this.slot3.ellipse(slotRadius, slotRadius - 9, 3, 5);
      this.slot3.fill({ color: 0xffaa00 });
    }

    // Update slot 4 (ice shard)
    this.slot4.clear();
    this.slot4.circle(slotRadius, slotRadius, slotRadius);
    this.slot4.fill({ color: 0x2a2a2a });
    this.slot4.stroke({ color: state.hasIce ? 0x66ccff : 0x4a4a4a, width: 2 });

    if (state.hasIce) {
      // Draw mini ice shard icon
      this.slot4.moveTo(slotRadius, slotRadius - 10);
      this.slot4.lineTo(slotRadius - 5, slotRadius);
      this.slot4.lineTo(slotRadius - 3, slotRadius + 6);
      this.slot4.lineTo(slotRadius + 3, slotRadius + 6);
      this.slot4.lineTo(slotRadius + 5, slotRadius);
      this.slot4.closePath();
      this.slot4.fill({ color: 0x66ccff });

      // Highlight
      this.slot4.circle(slotRadius, slotRadius - 6, 2);
      this.slot4.fill({ color: 0xffffff, alpha: 0.8 });
    }
  }

  /**
   * Get the HUD container
   */
  getContainer(): Container {
    return this.container;
  }
}
