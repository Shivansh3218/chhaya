import Phaser from 'phaser';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';

export type MBody = MatterJS.BodyType;
export type BB = { min: { x: number; y: number }; max: { x: number; y: number } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MJ = (Phaser.Physics.Matter as unknown as { Matter: any }).Matter;

export const CAT = { GROUND: 0x0001, PLAYER: 0x0002, PROP: 0x0004, DECO: 0x0008, STONE: 0x0010, PLAT: 0x0020 } as const;

export interface Light { x: number; y: number; r: number; k?: number; warm?: boolean }

/** everything in a level that does something */
export abstract class Ent {
  id: string;
  x: number; y: number;
  /** only updated while the camera is within this many px (0 = always) */
  range = 2600;
  constructor(public S: PlayScene, public d: EntDef) { this.id = d.id ?? ''; this.x = d.x; this.y = d.y; }
  abstract update(dt: number, t: number): void;
  /** called on respawn with the checkpoint index she restarts from */
  reset(_cp: number): void { /* nothing */ }
  /** lights this thing gives (lamps, fires, torches) */
  lights(_out: Light[]): void { /* none */ }
  /** the diya key pressed near it: return true if handled */
  act(): boolean { return false; }
  /** where `act` works (world circle) or null */
  actSpot(): { x: number; y: number; r: number; label?: string } | null { return null; }
  /** frightened by fire/light at a point (creatures) */
  scare(_x: number, _y: number, _k: number): void { /* none */ }
  destroy(): void { /* nothing */ }
}

/** a pushable/pullable rigid body */
export interface Prop {
  id: string;
  body: MBody;
  push: number;     // push speed px/s (0 = can't push)
  pull: number;     // pull speed (0 = can't pull)
  grabbable: boolean; // her hands catch its top corners
  heavy: boolean;   // presses plates
  alive: boolean;
}

export type EntCtor = new (S: PlayScene, d: EntDef) => Ent;
export const REGISTRY: Record<string, EntCtor> = {};
export function register(type: string, c: EntCtor) { REGISTRY[type] = c; }

/** helpers */
export const rectHit = (r: { x: number; y: number; w: number; h: number }, b: BB) =>
  b.max.x > r.x && b.min.x < r.x + r.w && b.max.y > r.y && b.min.y < r.y + r.h;
export const circHit = (cx: number, cy: number, rad: number, b: BB) => {
  const nx = Math.max(b.min.x, Math.min(cx, b.max.x)), ny = Math.max(b.min.y, Math.min(cy, b.max.y));
  return (nx - cx) ** 2 + (ny - cy) ** 2 < rad * rad;
};

export type Img = Phaser.GameObjects.Image;
