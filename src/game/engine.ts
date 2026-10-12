import {
  LevelDef,
  RuntimeHazard,
  RuntimeCollectible,
  RuntimePushBlock,
  PlayerState,
} from './types';
import { PLAYER_SPEED, COLLECTIBLE_RADIUS } from './constants';

export interface GameCallbacks {
  onDeath: () => void;
  onCollect: (collected: number, total: number) => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
  onStateChange: (status: GameStatusInternal) => void;
}

export type GameStatusInternal =
  | 'playing'
  | 'dying'
  | 'level-complete'
  | 'game-over'
  | 'paused';

interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private level: LevelDef;
  private callbacks: GameCallbacks;

  private player: PlayerState;
  private hazards: RuntimeHazard[] = [];
  private collectibles: RuntimeCollectible[] = [];
  private pushBlocks: RuntimePushBlock[] = [];
  private pushTargets: { x: number; y: number }[] = [];
  private walls: WallRect[] = [];
  private gateRect: WallRect = { x: 0, y: 0, w: 0, h: 0 };
  private gateOpen = false;
  private superHardMode = false;

  private status: GameStatusInternal = 'playing';
  private collectedCount = 0;
  private totalCollectibles = 0;
  private levelCompleted = false;

  private keys: Set<string> = new Set();
  private joystickDX = 0;
  private joystickDY = 0;
  private lastTime = 0;
  private rafId = 0;
  private deathTimer = 0;
  private completeTimer = 0;
  private flashTimer = 0;

  private lives = 0;
  private livesMode = false;
  private maxLives = 3;

  private elapsed = 0;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDef,
    callbacks: GameCallbacks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.level = level;
    this.callbacks = callbacks;

    this.player = {
      x: level.spawn.x * level.cellSize,
      y: level.spawn.y * level.cellSize,
      vx: 0,
      vy: 0,
      alive: true,
    };

    this.setupLevel();
  }

  setLivesMode(enabled: boolean, maxLives: number): void {
    this.livesMode = enabled;
    this.maxLives = maxLives;
    this.lives = maxLives;
  }

  setSuperHardMode(enabled: boolean): void {
    if (this.superHardMode === enabled) return;
    this.superHardMode = enabled;
    this.setupLevel();
    this.player.x = this.level.spawn.x * this.level.cellSize;
    this.player.y = this.level.spawn.y * this.level.cellSize;
  }

  private setupLevel(): void {
    const cs = this.level.cellSize;

    this.walls = this.level.walls.map((w) => ({
      x: w.x * cs,
      y: w.y * cs,
      w: w.w * cs,
      h: w.h * cs,
    }));

    this.hazards = this.level.hazards.map((h) => ({
      x: h.start.x * cs,
      y: h.start.y * cs,
      start: { x: h.start.x * cs, y: h.start.y * cs },
      end: { x: h.end.x * cs, y: h.end.y * cs },
      speed: h.speed * cs,
      phase: h.phase ?? 0,
      axis: h.axis,
      t: h.phase ?? 0,
      radius: this.level.hazardRadius,
    }));

    this.collectibles = this.level.collectibles.map((c) => ({
      x: c.x * cs,
      y: c.y * cs,
      collected: false,
      radius: COLLECTIBLE_RADIUS,
    }));

    const blockDefs = this.superHardMode
      ? this.level.superHardPushBlocks
      : this.level.pushBlocks;
    this.pushBlocks = blockDefs.map((block) => ({
      x: block.x * cs,
      y: block.y * cs,
      startX: block.x * cs,
      startY: block.y * cs,
      w: (block.w ?? 0.8) * cs,
      h: (block.h ?? 0.8) * cs,
    }));
    this.pushTargets = this.level.pushTargets.map((target) => ({
      x: target.x * cs,
      y: target.y * cs,
    }));
    this.gateRect = {
      x: this.level.goal.x * cs - cs * 0.4,
      y: this.level.goal.y * cs - cs * 0.4,
      w: cs * 0.8,
      h: cs * 0.8,
    };
    this.gateOpen = false;

    this.totalCollectibles = this.collectibles.length;
    this.collectedCount = 0;
    this.levelCompleted = false;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.callbacks.onStateChange(this.status);
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.lastTime = performance.now();
      this.callbacks.onStateChange(this.status);
    }
  }

  getStatus(): GameStatusInternal {
    return this.status;
  }

  getCollected(): number {
    return this.collectedCount;
  }

  getTotalCollectibles(): number {
    return this.totalCollectibles;
  }

  getLives(): number {
    return this.lives;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  handleKeyDown(code: string): void {
    this.keys.add(code);
  }

  handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  setJoystickDirection(dx: number, dy: number): void {
    this.joystickDX = dx;
    this.joystickDY = dy;
  }

  private loop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05; // clamp to prevent tunneling

    if (this.status === 'playing') {
      this.elapsed += dt;
      this.update(dt);
    } else if (this.status === 'dying') {
      this.deathTimer -= dt * 1000;
      this.flashTimer -= dt * 1000;
      if (this.deathTimer <= 0) {
        this.respawn();
      }
    } else if (this.status === 'level-complete') {
      this.completeTimer -= dt * 1000;
    }

    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateHazards(dt);
    this.checkCollectibles();
    this.checkHazardCollision();
    this.checkGoal();
  }

  private updatePlayer(dt: number): void {
    if (!this.player.alive) return;

    const speed = PLAYER_SPEED * this.level.cellSize * (this.superHardMode ? 1.15 : 1); // pixels per second
    let dx = this.joystickDX;
    let dy = this.joystickDY;

    if (
      this.keys.has('ArrowLeft') ||
      this.keys.has('KeyA')
    ) {
      dx -= 1;
    }
    if (
      this.keys.has('ArrowRight') ||
      this.keys.has('KeyD')
    ) {
      dx += 1;
    }
    if (
      this.keys.has('ArrowUp') ||
      this.keys.has('KeyW')
    ) {
      dy -= 1;
    }
    if (
      this.keys.has('ArrowDown') ||
      this.keys.has('KeyS')
    ) {
      dy += 1;
    }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.player.vx = dx * speed;
    this.player.vy = dy * speed;

    const halfSize = this.level.playerSize / 2;
    const cs = this.level.cellSize;

    // Move X
    let newX = this.player.x + this.player.vx * dt;
    newX = this.clampToWallsX(newX, this.player.y, halfSize);
    newX = this.resolvePushBlocksX(newX, this.player.y, halfSize);
    newX = this.clampToGateX(newX, this.player.y, halfSize);
    // Keep in bounds
    newX = Math.max(halfSize, Math.min(this.level.cols * cs - halfSize, newX));
    this.player.x = newX;

    // Move Y
    let newY = this.player.y + this.player.vy * dt;
    newY = this.clampToWallsY(this.player.x, newY, halfSize);
    newY = this.resolvePushBlocksY(this.player.x, newY, halfSize);
    newY = this.clampToGateY(this.player.x, newY, halfSize);
    newY = Math.max(halfSize, Math.min(this.level.rows * cs - halfSize, newY));
    this.player.y = newY;
  }

  private clampToWallsX(x: number, y: number, half: number): number {
    for (const w of this.walls) {
      const px = x + half;
      const nx = x - half;
      const py = y + half;
      const ny = y - half;
      if (nx < w.x + w.w && px > w.x && ny < w.y + w.h && py > w.y) {
        // Collision — push out
        if (this.player.vx > 0) {
          x = w.x - half - 0.01;
        } else if (this.player.vx < 0) {
          x = w.x + w.w + half + 0.01;
        }
      }
    }
    return x;
  }

  private clampToWallsY(x: number, y: number, half: number): number {
    for (const w of this.walls) {
      const px = x + half;
      const nx = x - half;
      const py = y + half;
      const ny = y - half;
      if (nx < w.x + w.w && px > w.x && ny < w.y + w.h && py > w.y) {
        if (this.player.vy > 0) {
          y = w.y - half - 0.01;
        } else if (this.player.vy < 0) {
          y = w.y + w.h + half + 0.01;
        }
      }
    }
    return y;
  }

  private resolvePushBlocksX(x: number, y: number, half: number): number {
    for (const block of this.pushBlocks) {
      if (!this.rectsOverlap(x - half, y - half, half * 2, half * 2, block.x - block.w / 2, block.y - block.h / 2, block.w, block.h)) {
        continue;
      }

      if (this.player.vx > 0) {
        const nextX = x + half + block.w / 2;
        if (this.canPlaceBlock(block, nextX, block.y)) {
          block.x = nextX;
          x = block.x - block.w / 2 - half - 0.01;
        } else {
          x = block.x - block.w / 2 - half - 0.01;
        }
      } else if (this.player.vx < 0) {
        const nextX = x - half - block.w / 2;
        if (this.canPlaceBlock(block, nextX, block.y)) {
          block.x = nextX;
          x = block.x + block.w / 2 + half + 0.01;
        } else {
          x = block.x + block.w / 2 + half + 0.01;
        }
      }
    }
    return x;
  }

  private resolvePushBlocksY(x: number, y: number, half: number): number {
    for (const block of this.pushBlocks) {
      if (!this.rectsOverlap(x - half, y - half, half * 2, half * 2, block.x - block.w / 2, block.y - block.h / 2, block.w, block.h)) {
        continue;
      }

      if (this.player.vy > 0) {
        const nextY = y + half + block.h / 2;
        if (this.canPlaceBlock(block, block.x, nextY)) {
          block.y = nextY;
          y = block.y - block.h / 2 - half - 0.01;
        } else {
          y = block.y - block.h / 2 - half - 0.01;
        }
      } else if (this.player.vy < 0) {
        const nextY = y - half - block.h / 2;
        if (this.canPlaceBlock(block, block.x, nextY)) {
          block.y = nextY;
          y = block.y + block.h / 2 + half + 0.01;
        } else {
          y = block.y + block.h / 2 + half + 0.01;
        }
      }
    }
    return y;
  }

  private canPlaceBlock(block: RuntimePushBlock, x: number, y: number): boolean {
    const halfW = block.w / 2;
    const halfH = block.h / 2;
    if (x - halfW < this.level.cellSize || x + halfW > (this.level.cols - 1) * this.level.cellSize) return false;
    if (y - halfH < this.level.cellSize || y + halfH > (this.level.rows - 1) * this.level.cellSize) return false;

    for (const wall of this.walls) {
      if (this.rectsOverlap(x - halfW, y - halfH, block.w, block.h, wall.x, wall.y, wall.w, wall.h)) return false;
    }
    for (const other of this.pushBlocks) {
      if (other === block) continue;
      if (this.rectsOverlap(x - halfW, y - halfH, block.w, block.h, other.x - other.w / 2, other.y - other.h / 2, other.w, other.h)) return false;
    }
    return true;
  }

  private rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private clampToGateX(x: number, y: number, half: number): number {
    if (this.gateOpen) return x;
    if (this.rectsOverlap(x - half, y - half, half * 2, half * 2, this.gateRect.x, this.gateRect.y, this.gateRect.w, this.gateRect.h)) {
      if (this.player.vx > 0) return this.gateRect.x - half - 0.01;
      if (this.player.vx < 0) return this.gateRect.x + this.gateRect.w + half + 0.01;
    }
    return x;
  }

  private clampToGateY(x: number, y: number, half: number): number {
    if (this.gateOpen) return y;
    if (this.rectsOverlap(x - half, y - half, half * 2, half * 2, this.gateRect.x, this.gateRect.y, this.gateRect.w, this.gateRect.h)) {
      if (this.player.vy > 0) return this.gateRect.y - half - 0.01;
      if (this.player.vy < 0) return this.gateRect.y + this.gateRect.h + half + 0.01;
    }
    return y;
  }

  private updateHazards(dt: number): void {
    for (const h of this.hazards) {
      // Triangle wave oscillation between start and end
      const hazardSpeed = h.speed * (this.superHardMode ? 1.8 : 1);
      h.t += (hazardSpeed * dt) / this.distance(h.start, h.end);
      h.t = h.t % 1;
      const phase = h.t + h.phase;
      const t = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;

      if (h.axis === 'x') {
        h.x = h.start.x + (h.end.x - h.start.x) * t;
        h.y = h.start.y;
      } else {
        h.x = h.start.x;
        h.y = h.start.y + (h.end.y - h.start.y) * t;
      }
    }
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  private checkCollectibles(): void {
    const half = this.level.playerSize / 2;
    // Player is a square, collectible is a circle — use circle-rect collision
    for (const c of this.collectibles) {
      if (c.collected) continue;
      const closestX = Math.max(
        this.player.x - half,
        Math.min(c.x, this.player.x + half),
      );
      const closestY = Math.max(
        this.player.y - half,
        Math.min(c.y, this.player.y + half),
      );
      const dx = c.x - closestX;
      const dy = c.y - closestY;
      if (dx * dx + dy * dy < c.radius * c.radius) {
        c.collected = true;
        this.collectedCount++;
        this.callbacks.onCollect(this.collectedCount, this.totalCollectibles);
      }
    }
  }

  private checkHazardCollision(): void {
    if (!this.player.alive || this.levelCompleted) return;

    const half = this.level.playerSize / 2;
    for (const h of this.hazards) {
      // Circle-rect collision
      const closestX = Math.max(
        this.player.x - half,
        Math.min(h.x, this.player.x + half),
      );
      const closestY = Math.max(
        this.player.y - half,
        Math.min(h.y, this.player.y + half),
      );
      const dx = h.x - closestX;
      const dy = h.y - closestY;
      if (dx * dx + dy * dy < h.radius * h.radius) {
        this.triggerDeath();
        return;
      }
    }
  }

  private checkGoal(): void {
    if (this.levelCompleted || !this.player.alive) return;

    this.gateOpen = this.isPuzzleSolved();
    const cs = this.level.cellSize;
    const goalX = this.level.goal.x * cs;
    const goalY = this.level.goal.y * cs;
    const goalHalf = cs * 0.4;
    const half = this.level.playerSize / 2;

    // Check if player overlaps goal area
    if (
      this.player.x + half > goalX - goalHalf &&
      this.player.x - half < goalX + goalHalf &&
      this.player.y + half > goalY - goalHalf &&
      this.player.y - half < goalY + goalHalf
    ) {
      if (this.collectedCount >= this.totalCollectibles && this.gateOpen) {
        this.triggerLevelComplete();
      }
    }
  }

  private isPuzzleSolved(): boolean {
    return this.pushTargets.every((target) =>
      this.pushBlocks.some((block) =>
        Math.hypot(block.x - target.x, block.y - target.y) < this.level.cellSize * 0.35,
      ),
    );
  }

  private isTargetFilled(target: { x: number; y: number }): boolean {
    return this.pushBlocks.some((block) =>
      Math.hypot(block.x - target.x, block.y - target.y) < this.level.cellSize * 0.35,
    );
  }

  private triggerDeath(): void {
    this.player.alive = false;
    this.status = 'dying';
    this.deathTimer = 450;
    this.flashTimer = 300;
    this.callbacks.onDeath();
    this.callbacks.onStateChange(this.status);
  }

  private respawn(): void {
    if (this.livesMode) {
      this.lives--;
      if (this.lives <= 0) {
        this.status = 'game-over';
        this.callbacks.onGameOver();
        this.callbacks.onStateChange(this.status);
        return;
      }
    }

    this.resetRunState();
    this.player.x = this.level.spawn.x * this.level.cellSize;
    this.player.y = this.level.spawn.y * this.level.cellSize;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.alive = true;
    this.status = 'playing';
    this.callbacks.onStateChange(this.status);
  }

  private resetRunState(): void {
    this.collectibles.forEach((collectible) => {
      collectible.collected = false;
    });
    this.collectedCount = 0;
    this.hazards.forEach((hazard) => {
      hazard.t = 0;
      hazard.x = hazard.start.x;
      hazard.y = hazard.start.y;
    });
    this.pushBlocks.forEach((block) => {
      block.x = block.startX;
      block.y = block.startY;
    });
    this.gateOpen = false;
    this.elapsed = 0;
    this.callbacks.onCollect(0, this.totalCollectibles);
  }

  private triggerLevelComplete(): void {
    this.levelCompleted = true;
    this.status = 'level-complete';
    this.completeTimer = 1200;
    this.callbacks.onLevelComplete();
    this.callbacks.onStateChange(this.status);
  }

  // ===== Rendering =====

  private render(): void {
    const ctx = this.ctx;
    const cs = this.level.cellSize;
    const w = this.level.cols * cs;
    const h = this.level.rows * cs;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.level.cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, h);
      ctx.stroke();
    }
    for (let j = 0; j <= this.level.rows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cs);
      ctx.lineTo(w, j * cs);
      ctx.stroke();
    }

    // Safe zones (start and goal areas) — green
    this.drawSafeZone(this.level.spawn.x * cs, this.level.spawn.y * cs, cs, '#0d3b1f', '#1a5e2f');
    const goalColor = this.collectedCount >= this.totalCollectibles ? '#1a5e2f' : '#0d3b1f';
    const goalBorder = this.collectedCount >= this.totalCollectibles ? '#22c55e' : '#1a5e2f';
    this.drawSafeZone(this.level.goal.x * cs, this.level.goal.y * cs, cs, goalColor, goalBorder);

    // Walls
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (const wall of this.walls) {
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }

    // Puzzle target pads
    for (const target of this.pushTargets) {
      const filled = this.isTargetFilled(target);
      ctx.fillStyle = filled ? 'rgba(34, 197, 94, 0.28)' : 'rgba(245, 158, 11, 0.16)';
      ctx.strokeStyle = filled ? '#22c55e' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(target.x, target.y, cs * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Gate at the exit
    if (!this.gateOpen) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.fillRect(this.gateRect.x, this.gateRect.y, this.gateRect.w, this.gateRect.h);
      ctx.strokeRect(this.gateRect.x, this.gateRect.y, this.gateRect.w, this.gateRect.h);
      ctx.strokeStyle = 'rgba(254, 226, 226, 0.7)';
      ctx.lineWidth = 2;
      for (let x = this.gateRect.x + 8; x < this.gateRect.x + this.gateRect.w; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, this.gateRect.y);
        ctx.lineTo(x, this.gateRect.y + this.gateRect.h);
        ctx.stroke();
      }
    }

    // Pushable puzzle blocks
    for (const block of this.pushBlocks) {
      ctx.fillStyle = '#a16207';
      ctx.fillRect(block.x - block.w / 2, block.y - block.h / 2, block.w, block.h);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(block.x - block.w / 2, block.y - block.h / 2, block.w, block.h);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(block.x - block.w * 0.25, block.y);
      ctx.lineTo(block.x + block.w * 0.25, block.y);
      ctx.moveTo(block.x, block.y - block.h * 0.25);
      ctx.lineTo(block.x, block.y + block.h * 0.25);
      ctx.stroke();
    }

    // Collectibles
    for (const c of this.collectibles) {
      if (c.collected) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner shine
      ctx.beginPath();
      ctx.arc(c.x - 3, c.y - 3, c.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#fde68a';
      ctx.fill();
    }

    // Hazards (blue balls)
    for (const h of this.hazards) {
      // Trail
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner shine
      ctx.beginPath();
      ctx.arc(h.x - 4, h.y - 4, h.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#93c5fd';
      ctx.fill();
    }

    // Player
    if (this.player.alive || this.status === 'dying') {
      const half = this.level.playerSize / 2;
      if (this.status === 'dying' && this.flashTimer > 0) {
        const alpha = Math.sin(this.flashTimer / 50) > 0 ? 0.8 : 0.2;
        ctx.globalAlpha = alpha;
      }

      // Glow
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, half + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.fillRect(this.player.x - half, this.player.y - half, this.level.playerSize, this.level.playerSize);
      ctx.strokeRect(this.player.x - half, this.player.y - half, this.level.playerSize, this.level.playerSize);

      // Inner shine
      ctx.fillStyle = 'rgba(252, 165, 165, 0.4)';
      ctx.fillRect(this.player.x - half + 3, this.player.y - half + 3, 6, 6);

      ctx.globalAlpha = 1;
    }
  }

  private drawSafeZone(x: number, y: number, cs: number, fill: string, border: string): void {
    const ctx = this.ctx;
    const size = cs * 0.8;
    const offset = (cs - size) / 2;
    ctx.fillStyle = fill;
    ctx.fillRect(x - cs / 2 + offset, y - cs / 2 + offset, size, size);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - cs / 2 + offset, y - cs / 2 + offset, size, size);
  }
}
