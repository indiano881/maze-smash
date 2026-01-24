import { Graphics } from 'pixi.js';
import { GameContext } from '../game-context';

/**
 * Mole enemy - burrows underground and pops up to damage player
 */
export class Mole {
  private graphics: Graphics;
  private dirtGraphics: Graphics;
  private dirtParticles: Graphics[] = [];
  private dirtOffsets: number[] = [];
  private context: GameContext;

  /** Grid position */
  x = 0;
  y = 0;

  /** Animation state */
  burrowed = true;
  popupProgress = 0; // 0-1 for surfacing animation
  burrowProgress = 0; // 0-1 for burrowing animation
  lastPopupTime = 0;
  popupInterval = 3000; // ms between popups
  surfaceDuration = 2000; // ms to stay surfaced
  surfaceTime = 0; // when mole surfaced
  active = true;

  constructor(context: GameContext) {
    this.context = context;

    // Main mole graphics
    this.graphics = new Graphics();
    context.staticContainer.addChild(this.graphics);

    // Dirt mound graphics
    this.dirtGraphics = new Graphics();
    context.staticContainer.addChild(this.dirtGraphics);

    // Dirt particles (brown particles when surfacing)
    for (let i = 0; i < 5; i++) {
      const particle = new Graphics();
      particle.circle(0, 0, 3);
      particle.fill({ color: 0x8b6f47, alpha: 0.9 });
      this.dirtParticles.push(particle);
      this.dirtOffsets.push(Math.random() * 30);
      context.staticContainer.addChild(particle);
    }
  }

  /**
   * Reset mole to a new position
   */
  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.burrowed = true;
    this.popupProgress = 0;
    this.burrowProgress = 0;
    this.lastPopupTime = Date.now();
    this.surfaceTime = 0;
    this.active = true;

    // Reset dirt particle offsets
    for (let i = 0; i < this.dirtOffsets.length; i++) {
      this.dirtOffsets[i] = Math.random() * 30;
    }

    this.drawDirtMound();
    this.draw();
  }

  /**
   * Update mole animation state (call each frame)
   */
  update(): void {
    if (!this.active) return;

    const now = Date.now();

    if (this.burrowed) {
      // Check if it's time to popup
      if (now - this.lastPopupTime >= this.popupInterval) {
        // Start surfacing
        this.burrowed = false;
        this.popupProgress = 0;
        this.burrowProgress = 0;
        this.surfaceTime = 0;
      }
    } else if (this.popupProgress < 1) {
      // Surfacing animation (500ms)
      this.popupProgress += 1 / 30; // ~500ms at 60fps
      if (this.popupProgress >= 1) {
        this.popupProgress = 1;
        this.surfaceTime = now;
      }
    } else if (this.burrowProgress === 0) {
      // Fully surfaced - check if it's time to burrow
      if (now - this.surfaceTime >= this.surfaceDuration) {
        // Start burrowing
        this.burrowProgress = 0.01; // Start burrow animation
      }
    } else if (this.burrowProgress < 1) {
      // Burrowing animation (300ms)
      this.burrowProgress += 1 / 18; // ~300ms at 60fps
      if (this.burrowProgress >= 1) {
        // Fully burrowed - move to new position
        this.burrowed = true;
        this.popupProgress = 0;
        this.burrowProgress = 0;
        this.lastPopupTime = now;
        this.moveToNewPosition();
      }
    }
  }

  /**
   * Move mole to a new position (AI movement toward player)
   */
  private moveToNewPosition(): void {
    // Mole uses maze from context for pathfinding
    // Movement logic will be called from game component
  }

  /**
   * Move toward target (called from game component with player position)
   */
  moveToward(targetX: number, targetY: number): void {
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 }, // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }, // right
    ];

    // Filter valid moves
    const validMoves = directions.filter((d) => {
      const newX = this.x + d.dx;
      const newY = this.y + d.dy;
      return this.context.maze.canMove(this.x, this.y, newX, newY);
    });

    if (validMoves.length === 0) return;

    // 50% chance to move toward target, 50% random
    if (Math.random() < 0.5) {
      // Move toward target
      const toTarget = validMoves.sort((a, b) => {
        const distA = Math.abs(this.x + a.dx - targetX) + Math.abs(this.y + a.dy - targetY);
        const distB = Math.abs(this.x + b.dx - targetX) + Math.abs(this.y + b.dy - targetY);
        return distA - distB;
      });
      const move = toTarget[0];
      this.x += move.dx;
      this.y += move.dy;
    } else {
      // Random move
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.x += move.dx;
      this.y += move.dy;
    }

    // Update dirt mound position
    this.drawDirtMound();
  }

  /**
   * Draw mole graphics
   */
  draw(): void {
    if (!this.active) {
      this.graphics.visible = false;
      return;
    }

    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;

    this.graphics.clear();

    // Calculate Y offset based on popup/burrow progress
    let yOffset = 30 * scale; // Fully underground
    if (!this.burrowed) {
      if (this.burrowProgress > 0) {
        // Burrowing down
        yOffset = this.burrowProgress * 30 * scale;
      } else {
        // Surfacing or surfaced
        yOffset = (1 - this.popupProgress) * 30 * scale;
      }
    }

    // Only draw mole if visible (not fully burrowed)
    if (this.burrowed) {
      this.graphics.visible = false;
      return;
    }

    this.graphics.visible = true;

    // Dark brown oval body with outline
    this.graphics.ellipse(0, -12 * scale + yOffset, 16 * scale, 12 * scale);
    this.graphics.fill({ color: 0x4a3728 });
    this.graphics.stroke({ color: 0x1a1a1a, width: 2 });

    // Lighter belly
    this.graphics.ellipse(0, -8 * scale + yOffset, 10 * scale, 6 * scale);
    this.graphics.fill({ color: 0x6b5344 });

    // Pink nose
    this.graphics.circle(0, -2 * scale + yOffset, 4 * scale);
    this.graphics.fill({ color: 0xffb6c1 });

    // Black sunglasses
    // Left lens
    this.graphics.roundRect(-10 * scale, -18 * scale + yOffset, 8 * scale, 5 * scale, 2 * scale);
    this.graphics.fill({ color: 0x1a1a1a });
    // Right lens
    this.graphics.roundRect(2 * scale, -18 * scale + yOffset, 8 * scale, 5 * scale, 2 * scale);
    this.graphics.fill({ color: 0x1a1a1a });
    // Bridge
    this.graphics.roundRect(-2 * scale, -16 * scale + yOffset, 4 * scale, 2 * scale, 1 * scale);
    this.graphics.fill({ color: 0x1a1a1a });

    // Lens shine
    this.graphics.circle(-7 * scale, -17 * scale + yOffset, 2 * scale);
    this.graphics.fill({ color: 0x444444 });
    this.graphics.circle(5 * scale, -17 * scale + yOffset, 2 * scale);
    this.graphics.fill({ color: 0x444444 });

    // Front paws (visible when surfaced)
    if (this.popupProgress > 0.5) {
      // Left paw
      this.graphics.ellipse(-12 * scale, 2 * scale + yOffset, 5 * scale, 3 * scale);
      this.graphics.fill({ color: 0x3a2718 });
      // Right paw
      this.graphics.ellipse(12 * scale, 2 * scale + yOffset, 5 * scale, 3 * scale);
      this.graphics.fill({ color: 0x3a2718 });
    }

    this.graphics.x = x;
    this.graphics.y = y;
    this.graphics.zIndex = (this.x + this.y) * 100 + 25;
  }

  /**
   * Draw dirt mound at mole position
   */
  drawDirtMound(): void {
    if (!this.active) {
      this.dirtGraphics.visible = false;
      return;
    }

    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;

    this.dirtGraphics.clear();
    this.dirtGraphics.visible = true;

    // Brown dirt mound ellipse
    this.dirtGraphics.ellipse(0, 5 * scale, 20 * scale, 8 * scale);
    this.dirtGraphics.fill({ color: 0x8b6f47 });
    this.dirtGraphics.stroke({ color: 0x5a4530, width: 1 });

    // Dirt texture lines (cracks)
    this.dirtGraphics.moveTo(-8 * scale, 3 * scale);
    this.dirtGraphics.lineTo(-4 * scale, 7 * scale);
    this.dirtGraphics.stroke({ color: 0x5a4530, width: 1 });

    this.dirtGraphics.moveTo(3 * scale, 2 * scale);
    this.dirtGraphics.lineTo(8 * scale, 8 * scale);
    this.dirtGraphics.stroke({ color: 0x5a4530, width: 1 });

    // Small dirt lumps
    this.dirtGraphics.ellipse(-10 * scale, 8 * scale, 4 * scale, 2 * scale);
    this.dirtGraphics.fill({ color: 0x7a5f37 });
    this.dirtGraphics.ellipse(12 * scale, 6 * scale, 3 * scale, 2 * scale);
    this.dirtGraphics.fill({ color: 0x7a5f37 });

    this.dirtGraphics.x = x;
    this.dirtGraphics.y = y;
    this.dirtGraphics.zIndex = (this.x + this.y) * 100 + 5;
  }

  /**
   * Animate dirt particles when surfacing (call each frame)
   */
  animateDirtParticles(): void {
    // Only show particles when mole is surfacing
    const showParticles = !this.burrowed && this.popupProgress < 1 && this.popupProgress > 0;

    if (!showParticles) {
      this.dirtParticles.forEach((p) => (p.visible = false));
      return;
    }

    const { x, y } = this.context.toIso(this.x, this.y);
    const scale = this.context.tileWidth / 80;
    const xOffsets = [-15, -7, 0, 7, 15];

    this.dirtParticles.forEach((particle, i) => {
      // Move particle upward
      this.dirtOffsets[i] += 1.5;

      // Reset when reaching top
      if (this.dirtOffsets[i] > 35) {
        this.dirtOffsets[i] = 0;
      }

      // Position particle
      particle.x = x + xOffsets[i] * scale;
      particle.y = y - this.dirtOffsets[i] * scale;
      particle.zIndex = (this.x + this.y) * 100 + 30;
      particle.visible = true;

      // Fade based on position
      particle.alpha = 1 - (this.dirtOffsets[i] / 35) * 0.8;
    });
  }

  /**
   * Check if mole is surfaced and dangerous
   */
  isSurfaced(): boolean {
    return !this.burrowed && this.popupProgress > 0.5;
  }

  /**
   * Teleport mole to random position (after hitting player)
   */
  teleportRandom(avoidX: number, avoidY: number): void {
    this.burrowed = true;
    this.popupProgress = 0;
    this.burrowProgress = 0;
    this.lastPopupTime = Date.now();

    let attempts = 0;
    do {
      this.x = Math.floor(Math.random() * (this.context.mazeWidth - 2)) + 1;
      this.y = Math.floor(Math.random() * (this.context.mazeHeight - 2)) + 1;
      attempts++;
    } while (
      ((this.x === 0 && this.y === 0) || (this.x === avoidX && this.y === avoidY)) &&
      attempts < 20
    );

    this.drawDirtMound();
  }

  /**
   * Get main graphics (for container management)
   */
  getGraphics(): Graphics {
    return this.graphics;
  }

  /**
   * Get dirt graphics (for container management)
   */
  getDirtGraphics(): Graphics {
    return this.dirtGraphics;
  }

  /**
   * Get dirt particles (for container management)
   */
  getDirtParticles(): Graphics[] {
    return this.dirtParticles;
  }
}
