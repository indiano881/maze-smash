import { Container } from 'pixi.js';
import { Maze } from './maze';

/**
 * Garden Theme Colors
 * Shared color palette for consistent visual styling across all game entities
 */
export const GARDEN = {
  hedgeGreen: 0x4e7b15,
  hedgeDark: 0x3a5c10,
  hedgeLight: 0x5e9b1a,
  roseRed: 0xe31e24,
  roseDark: 0xb01820,
  marbleWhite: 0xf2f2f2,
  marbleVein: 0xd1d1d1,
  outline: 0x1a1a1a,
  outlineWidth: 2,
  shadowAlpha: 0.2,
  glowYellow: 0xfffacd,
  // Gardener colors
  skinPeach: 0xffdbaC,
  overallsBlue: 0x4a7cb0,
  overallsDark: 0x3a6090,
  strawHat: 0xe8d4a0,
  strawHatDark: 0xc8b480,
  wateringCan: 0x808080,
  wateringCanDark: 0x606060,
};

/**
 * GameContext provides shared dependencies to all game entities/systems.
 * Passed via constructor injection rather than DI or singleton patterns.
 */
export interface GameContext {
  /** Container for static elements - floor, walls, entities */
  staticContainer: Container;

  /** Convert grid coordinates to isometric screen position */
  toIso: (x: number, y: number) => { x: number; y: number };

  /** Calculate z-index for depth sorting */
  getDepth: (x: number, y: number, layer: 'floor' | 'backWall' | 'sprite' | 'frontWall') => number;

  /** Tile dimensions in pixels */
  tileWidth: number;
  tileHeight: number;
  wallHeight: number;

  /** Maze data and dimensions */
  maze: Maze;
  mazeWidth: number;
  mazeHeight: number;
}
