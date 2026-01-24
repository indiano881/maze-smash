import { Graphics } from 'pixi.js';
import { GameContext, GARDEN } from '../game-context';

/**
 * Exit position
 */
export interface ExitPosition {
  x: number;
  y: number;
}

/**
 * MazeRenderer - handles rendering of floor tiles, walls, and exit
 */
export class MazeRenderer {
  private context: GameContext;

  constructor(context: GameContext) {
    this.context = context;
  }

  /**
   * Draw all maze elements (floors, walls, exit)
   */
  drawMaze(exit: ExitPosition): void {
    // Draw floors first
    for (let y = 0; y < this.context.mazeHeight; y++) {
      for (let x = 0; x < this.context.mazeWidth; x++) {
        this.drawFloor(x, y);
      }
    }

    // Draw walls and exit
    for (let y = 0; y < this.context.mazeHeight; y++) {
      for (let x = 0; x < this.context.mazeWidth; x++) {
        this.drawWalls(x, y);

        // Draw exit
        if (exit.x === x && exit.y === y) {
          this.drawExit(x, y);
        }
      }
    }
  }

  /**
   * Draw floor tile at grid position
   */
  private drawFloor(gridX: number, gridY: number): void {
    const { x, y } = this.context.toIso(gridX, gridY);
    const hw = this.context.tileWidth / 2;
    const hh = this.context.tileHeight / 2;

    const floor = new Graphics();

    // White marble base
    floor.poly([
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ]);
    floor.fill({ color: GARDEN.marbleWhite });

    // Marble vein pattern (subtle grey lines)
    // Use seeded randomness based on grid position for consistent patterns
    const seed = gridX * 7 + gridY * 13;
    const veinOffset1 = ((seed % 5) - 2) * 0.1;
    const veinOffset2 = ((seed % 7) - 3) * 0.08;

    // First vein
    floor.moveTo(-hw * 0.3, -hh * 0.2 + veinOffset1 * hh);
    floor.quadraticCurveTo(0, hh * 0.1 + veinOffset2 * hh, hw * 0.4, -hh * 0.1);
    floor.stroke({ color: GARDEN.marbleVein, width: 1, alpha: 0.6 });

    // Second vein
    floor.moveTo(-hw * 0.1, hh * 0.3 + veinOffset2 * hh);
    floor.quadraticCurveTo(hw * 0.2, 0, hw * 0.3, -hh * 0.4 + veinOffset1 * hh);
    floor.stroke({ color: GARDEN.marbleVein, width: 1.5, alpha: 0.4 });

    // Tile outline
    floor.poly([
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ]);
    floor.stroke({ color: 0xe0e0e0, width: 1 });

    // Shadow on floor (20% opacity)
    floor.poly([
      { x: -hw * 0.3, y: 0 },
      { x: 0, y: hh * 0.3 },
      { x: hw * 0.3, y: 0 },
      { x: 0, y: -hh * 0.3 },
    ]);
    floor.fill({ color: 0x000000, alpha: GARDEN.shadowAlpha });

    floor.x = x;
    floor.y = y;
    floor.zIndex = this.context.getDepth(gridX, gridY, 'floor');
    this.context.staticContainer.addChild(floor);
  }

  /**
   * Draw walls at grid position
   */
  private drawWalls(gridX: number, gridY: number): void {
    if (!this.context.maze?.cells?.[gridY]?.[gridX]) return;

    const cell = this.context.maze.cells[gridY][gridX];
    const { x, y } = this.context.toIso(gridX, gridY);
    const hw = this.context.tileWidth / 2;
    const hh = this.context.tileHeight / 2;
    const wh = this.context.wallHeight;

    // Helper to draw roses on hedge face
    const drawRoses = (
      wall: Graphics,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      seed: number
    ) => {
      const roseCount = 2 + (seed % 2);
      for (let i = 0; i < roseCount; i++) {
        const t = (i + 0.5) / roseCount + ((seed * (i + 1)) % 10) * 0.03;
        const rx = startX + (endX - startX) * t;
        const ry = startY + (endY - startY) * t - wh * 0.4 - ((seed * i) % 5) * 2;

        // Rose petals
        wall.circle(rx, ry, 3);
        wall.fill({ color: GARDEN.roseRed });
        wall.circle(rx - 2, ry - 1, 2);
        wall.fill({ color: GARDEN.roseRed });
        wall.circle(rx + 2, ry - 1, 2);
        wall.fill({ color: GARDEN.roseRed });
        // Rose center
        wall.circle(rx, ry - 1, 1.5);
        wall.fill({ color: GARDEN.roseDark });
      }
    };

    // Top wall (blocks Y-1 movement) - NE edge - hedge
    if (cell.walls.top === true) {
      const wall = new Graphics();
      const seed = gridX * 11 + gridY * 17;

      // Hedge body (lighter green for top-facing)
      wall.moveTo(0, -hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, -hh / 2 - wh - 4, 0, -hh - wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeGreen });
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture bumps
      for (let i = 0; i < 3; i++) {
        const bx = hw * 0.2 + i * hw * 0.25;
        const by = -hh / 2 + i * hh * 0.15 - wh * 0.5;
        wall.circle(bx, by, 4);
        wall.fill({ color: GARDEN.hedgeLight });
      }

      // Roses
      drawRoses(wall, 0, -hh, hw, 0, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 10;
      this.context.staticContainer.addChild(wall);
    }

    // Left wall (blocks X-1 movement) - NW edge - hedge (darker side)
    if (cell.walls.left) {
      const wall = new Graphics();
      const seed = gridX * 13 + gridY * 19;

      wall.moveTo(-hw, 0);
      wall.lineTo(0, -hh);
      wall.lineTo(0, -hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, -hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeDark }); // Darker for depth
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.7 + i * hw * 0.2;
        const by = -hh / 2 + i * hh * 0.12 - wh * 0.5;
        wall.circle(bx, by, 3);
        wall.fill({ color: GARDEN.hedgeGreen });
      }

      // Roses
      drawRoses(wall, -hw, 0, 0, -hh, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY) * 100 - 10;
      this.context.staticContainer.addChild(wall);
    }

    // Bottom wall (blocks Y+1 movement) - SW edge - hedge (darker side)
    if (cell.walls.bottom) {
      const wall = new Graphics();
      const seed = gridX * 23 + gridY * 29;

      wall.moveTo(-hw, 0);
      wall.lineTo(0, hh);
      wall.lineTo(0, hh - wh);
      wall.quadraticCurveTo(-hw * 0.5, hh / 2 - wh - 4, -hw, -wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeDark }); // Darker for depth
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.7 + i * hw * 0.2;
        const by = hh / 2 - i * hh * 0.12 - wh * 0.5;
        wall.circle(bx, by, 3);
        wall.fill({ color: GARDEN.hedgeGreen });
      }

      // Roses
      drawRoses(wall, -hw, 0, 0, hh, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY + 1) * 100 - 10;
      this.context.staticContainer.addChild(wall);
    }

    // Right wall (blocks X+1 movement) - SE edge - hedge
    if (cell.walls.right) {
      const wall = new Graphics();
      const seed = gridX * 31 + gridY * 37;

      wall.moveTo(0, hh);
      wall.lineTo(hw, 0);
      wall.lineTo(hw, -wh);
      wall.quadraticCurveTo(hw * 0.5, hh / 2 - wh - 4, 0, hh - wh);
      wall.closePath();
      wall.fill({ color: GARDEN.hedgeGreen });
      wall.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Leaf texture
      for (let i = 0; i < 3; i++) {
        const bx = hw * 0.2 + i * hw * 0.25;
        const by = hh / 2 - i * hh * 0.15 - wh * 0.5;
        wall.circle(bx, by, 4);
        wall.fill({ color: GARDEN.hedgeLight });
      }

      // Roses
      drawRoses(wall, 0, hh, hw, 0, seed);

      wall.x = x;
      wall.y = y;
      wall.zIndex = (gridX + gridY + 1) * 100 - 10;
      this.context.staticContainer.addChild(wall);
    }

    // Corner connectors - hedge topiary spheres
    this.drawCorners(gridX, gridY, cell.walls);
  }

  /**
   * Draw corner pillars where walls meet
   */
  private drawCorners(
    gridX: number,
    gridY: number,
    walls: { top: boolean; bottom: boolean; left: boolean; right: boolean }
  ): void {
    const { x, y } = this.context.toIso(gridX, gridY);
    const hw = this.context.tileWidth / 2;
    const hh = this.context.tileHeight / 2;
    const wh = this.context.wallHeight;
    const pr = wh * 0.5;

    const drawHedgePillar = (corner: Graphics, px: number, py: number) => {
      // Base
      corner.circle(px, py, pr * 0.7);
      corner.fill({ color: GARDEN.hedgeDark });

      // Body (tapers up)
      corner.moveTo(px - pr * 0.6, py);
      corner.quadraticCurveTo(px - pr * 0.4, py - wh * 0.5, px - pr * 0.5, py - wh);
      corner.lineTo(px + pr * 0.5, py - wh);
      corner.quadraticCurveTo(px + pr * 0.4, py - wh * 0.5, px + pr * 0.6, py);
      corner.closePath();
      corner.fill({ color: GARDEN.hedgeGreen });
      corner.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Topiary ball on top
      corner.circle(px, py - wh - pr * 0.3, pr * 0.6);
      corner.fill({ color: GARDEN.hedgeGreen });
      corner.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

      // Highlight
      corner.circle(px - pr * 0.2, py - wh - pr * 0.5, pr * 0.2);
      corner.fill({ color: GARDEN.hedgeLight });
    };

    // Top corner
    if (walls.top || walls.left) {
      const corner = new Graphics();
      drawHedgePillar(corner, 0, -hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY - 1) * 100 + 40;
      this.context.staticContainer.addChild(corner);
    }

    // Right corner
    if (walls.top || walls.right) {
      const corner = new Graphics();
      drawHedgePillar(corner, hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 40;
      this.context.staticContainer.addChild(corner);
    }

    // Left corner
    if (walls.left || walls.bottom) {
      const corner = new Graphics();
      drawHedgePillar(corner, -hw, 0);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY) * 100 + 40;
      this.context.staticContainer.addChild(corner);
    }

    // Bottom corner
    if (walls.bottom || walls.right) {
      const corner = new Graphics();
      drawHedgePillar(corner, 0, hh);
      corner.x = x;
      corner.y = y;
      corner.zIndex = (gridX + gridY + 1) * 100 + 40;
      this.context.staticContainer.addChild(corner);
    }
  }

  /**
   * Draw exit gate at grid position
   */
  private drawExit(gridX: number, gridY: number): void {
    const { x, y } = this.context.toIso(gridX, gridY);
    const scale = this.context.tileWidth / 80;

    const exit = new Graphics();

    // Soft radial glow (pale yellow) - multiple layers for gradient effect
    exit.circle(0, -20 * scale, 50 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.15 });
    exit.circle(0, -20 * scale, 40 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.2 });
    exit.circle(0, -20 * scale, 30 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.25 });

    // Garden archway - hedge pillars
    exit.roundRect(-20 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Left pillar topiary ball
    exit.circle(-16 * scale, -58 * scale, 6 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    exit.roundRect(12 * scale, -55 * scale, 8 * scale, 60 * scale, 4 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });
    // Right pillar topiary ball
    exit.circle(16 * scale, -58 * scale, 6 * scale);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Arch top (hedge)
    exit.arc(0, -55 * scale, 16 * scale, Math.PI, 0);
    exit.fill({ color: GARDEN.hedgeGreen });
    exit.stroke({ color: GARDEN.outline, width: GARDEN.outlineWidth });

    // Garden gate opening (warm light inside)
    exit.roundRect(-12 * scale, -50 * scale, 24 * scale, 52 * scale, 6 * scale);
    exit.fill({ color: 0xfffae6 });

    // Soft inner glow
    exit.roundRect(-8 * scale, -45 * scale, 16 * scale, 45 * scale, 4 * scale);
    exit.fill({ color: GARDEN.glowYellow, alpha: 0.4 });

    // Roses on archway
    exit.circle(-18 * scale, -35 * scale, 3);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(-15 * scale, -25 * scale, 2.5);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(18 * scale, -40 * scale, 3);
    exit.fill({ color: GARDEN.roseRed });
    exit.circle(15 * scale, -30 * scale, 2.5);
    exit.fill({ color: GARDEN.roseRed });

    exit.x = x;
    exit.y = y;
    exit.zIndex = this.context.getDepth(gridX, gridY, 'sprite');
    this.context.staticContainer.addChild(exit);
  }
}
