export interface Vec2 {
  x: number;
  y: number;
}

export interface HazardDef {
  /** Start position in grid units */
  start: Vec2;
  /** End position in grid units */
  end: Vec2;
  /** Speed in grid units per second */
  speed: number;
  /** Phase offset 0-1 for staggered movement */
  phase?: number;
  /** "x" or "y" — which axis it travels along */
  axis: 'x' | 'y';
}

export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CollectibleDef {
  x: number;
  y: number;
}

export interface PushBlockDef {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface PushTargetDef {
  x: number;
  y: number;
}

export interface LevelDef {
  id: number;
  name: string;
  /** Grid dimensions */
  cols: number;
  rows: number;
  /** Spawn position in grid units (center of cell) */
  spawn: Vec2;
  /** Goal position in grid units */
  goal: Vec2;
  /** Player size in pixels */
  playerSize: number;
  /** Hazard radius in pixels */
  hazardRadius: number;
  /** Cell size in pixels */
  cellSize: number;
  /** Walls as rectangles in grid units */
  walls: WallDef[];
  /** Moving blue hazards */
  hazards: HazardDef[];
  /** Yellow collectibles (coins) — must collect all to unlock goal */
  collectibles: CollectibleDef[];
  /** Rectangular puzzle blocks the player can push */
  pushBlocks: PushBlockDef[];
  /** Extra blocks used by Super Hard mode */
  superHardPushBlocks: PushBlockDef[];
  /** Positions where blocks must be parked */
  pushTargets: PushTargetDef[];
  /** Static hazard circles (don't move) */
  staticHazards?: HazardDef[];
}

export type GameStatus = 'playing' | 'paused' | 'level-complete' | 'game-over';

export interface RuntimeHazard {
  x: number;
  y: number;
  start: Vec2;
  end: Vec2;
  speed: number;
  phase: number;
  axis: 'x' | 'y';
  /** 0 to 1 cycle position */
  t: number;
  radius: number;
}

export interface RuntimeCollectible {
  x: number;
  y: number;
  collected: boolean;
  radius: number;
}

export interface RuntimePushBlock {
  x: number;
  y: number;
  startX: number;
  startY: number;
  w: number;
  h: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

export interface SaveData {
  highestUnlocked: number;
  deaths: number;
  bestDeaths: Record<number, number>;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  musicEnabled: boolean;
  livesMode: boolean;
  maxLives: number;
  superHardMode: boolean;
}

export const DEFAULT_SAVE: SaveData = {
  highestUnlocked: 1,
  deaths: 0,
  bestDeaths: {},
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.4,
  musicEnabled: true,
  livesMode: false,
  maxLives: 3,
  superHardMode: false,
};
