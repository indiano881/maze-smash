import { Container, Graphics } from 'pixi.js';
import { GameContext } from '../game-context';

/**
 * Fog of war system - renders darkness over unexplored/distant areas
 */
export class FogSystem {
  private container: Container;
  private context: GameContext;
  private baseVisibility: number;
  private torchVisibility: number;

  constructor(
    context: GameContext,
    gameContainer: Container,
    baseVisibility = 5,
    torchVisibility = 10
  ) {
    this.context = context;
    this.baseVisibility = baseVisibility;
    this.torchVisibility = torchVisibility;

    // Fog container (drawn on top of everything except HUD)
    this.container = new Container();
    this.container.sortableChildren = true;
    gameContainer.addChild(this.container);
  }

  /**
   * Update fog based on player position and torch power
   */
  update(playerX: number, playerY: number, torchActive: boolean): void {
    // Clear previous fog
    while (this.container.children.length > 0) {
      const child = this.container.children[0];
      this.container.removeChild(child);
      child.destroy();
    }

    const visibility = torchActive ? this.torchVisibility : this.baseVisibility;
    const pX = Math.round(playerX);
    const pY = Math.round(playerY);

    // Draw fog for each cell outside visibility
    for (let y = 0; y < this.context.mazeHeight; y++) {
      for (let x = 0; x < this.context.mazeWidth; x++) {
        const distance = Math.abs(x - pX) + Math.abs(y - pY); // Manhattan distance

        if (distance > visibility) {
          // Fully fogged
          this.drawFogTile(x, y, 0.9);
        } else if (distance > visibility - 1) {
          // Partial fog (edge of visibility)
          this.drawFogTile(x, y, 0.5);
        }
      }
    }
  }

  /**
   * Draw a single fog tile
   */
  private drawFogTile(gridX: number, gridY: number, alpha: number): void {
    const { x, y } = this.context.toIso(gridX, gridY);
    const hw = this.context.tileWidth / 2;
    const hh = this.context.tileHeight / 2;
    const wh = this.context.wallHeight;

    const fog = new Graphics();
    fog.poly([
      { x: 0, y: -hh - wh },
      { x: hw, y: -wh },
      { x: hw, y: hh },
      { x: 0, y: hh + hh },
      { x: -hw, y: hh },
      { x: -hw, y: -wh },
    ]);
    fog.fill({ color: 0x000000, alpha });

    fog.x = x;
    fog.y = y;
    fog.zIndex = (gridX + gridY) * 100 + 99; // Draw on top of everything in that cell
    this.container.addChild(fog);
  }

  /**
   * Get the fog container
   */
  getContainer(): Container {
    return this.container;
  }
}
