import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { Ent } from '../ents/base';

// Shared behaviour for creatures: a ground query, light checks, fear of fire, being caught in a trap, and the
// telegraph → act → recover rhythm every threat follows.

export abstract class Creature extends Ent {
  alive = true;
  facing = 1;
  state = 'idle';
  stT = 0;              // seconds in the current state
  fear = 0;             // 0..1, set by fire and lamplight nearby
  fearX = 0;
  caught = '';
  home: { x: number; y: number };

  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.home = { x: d.x, y: d.y };
    this.facing = (d.facing as number) ?? 1;
    S.creatures.push(this);
    this.range = 0;
  }

  set(st: string) { if (this.state !== st) { this.state = st; this.stT = 0; } }
  ground(x: number, fromY = this.y - 60) { return this.S.groundTop(x, fromY); }
  onGround() { return Math.abs(this.ground(this.x) - this.y) < 6; }
  trapped(kind: string) { this.caught = kind; }
  scare(x: number, _y: number, k: number) { if (Math.abs(x - this.x) < 260) { this.fear = Math.max(this.fear, k); this.fearX = x; } }
  /** is she visible (in some light) and in range */
  seesHer(range: number) {
    const P = this.S.P;
    if (this.S.dead) return false;
    const d = Math.abs(P.x - this.x);
    return d < range && Math.abs(P.feetY - this.y) < 160;
  }
  /** the player's distance, signed (+ = she is to the right) */
  dxP() { return this.S.P.x - this.x; }
  litAt(x: number, y: number, minK = 0.25) {
    // lamplight and fire only (her own small flame doesn't count)
    const lights = this.S.lightList().filter((l) => l.r > 150);
    return this.S.lightAt(x, y, lights) > minK;
  }
  resetTo(x: number, y: number, st = 'idle') { this.x = x; this.y = y; this.set(st); this.fear = 0; this.caught = ''; this.alive = true; }
  tick(dt: number) { this.stT += dt; this.fear = Math.max(0, this.fear - dt * 0.6); }
}
