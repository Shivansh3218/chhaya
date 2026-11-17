import Phaser from 'phaser';
import { ART_OVERRIDES } from '../artOverrides';

// Shared tools for jointed, procedurally animated silhouettes: two-bone IK, tapered limb textures, bones placed
// between two points, verlet chains (tails, braids, tendrils, threads) and legs that plant and step.

export const INK = '#07080a';
export const RES = 4;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export type V = { x: number; y: number };

/** two-bone IK in a plane. bend = +1 / -1 picks which way the middle joint bends */
export function ik(ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bend: number) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.001;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < 0.001) d = 0.001;
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = Math.atan2(dy, dx) - bend * a;
  return { jx: ax + Math.cos(ang) * l1, jy: ay + Math.sin(ang) * l1, ex: ax + dx, ey: ay + dy };
}

/** draw a texture at RES x (skipped if it exists or hand-made art replaced it) */
export function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, color = INK) {
  if (scene.textures.exists(key) || ART_OVERRIDES.has(key)) return key;
  const t = scene.textures.createCanvas(key, Math.ceil(w * RES), Math.ceil(h * RES))!;
  const c = t.getContext();
  c.scale(RES, RES);
  c.fillStyle = color; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
  draw(c);
  t.refresh();
  return key;
}

/** a tapered limb from (r1, H/2) to (r1 + len, H/2); returns origin-x so the image's origin sits on the start joint */
export function capsule(scene: Phaser.Scene, key: string, len: number, w1: number, w2: number, color = INK) {
  const r1 = w1 / 2, r2 = w2 / 2, H = Math.max(w1, w2);
  tex(scene, key, len + r1 + r2, H, (c) => {
    const y = H / 2;
    c.beginPath();
    c.arc(r1, y, r1, Math.PI / 2, Math.PI * 1.5);
    c.lineTo(r1 + len, y - r2);
    c.arc(r1 + len, y, r2, -Math.PI / 2, Math.PI / 2);
    c.closePath();
    c.fill();
  }, color);
  return { key, ox: r1 / (len + r1 + r2), len };
}

/** a bone: an image stretched from joint a to joint b */
export class Bone {
  img: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene, public spec: { key: string; ox: number; len: number }, depth: number, parent?: Phaser.GameObjects.Container) {
    this.img = scene.add.image(0, 0, spec.key).setOrigin(spec.ox, 0.5).setScale(1 / RES).setDepth(depth);
    if (parent) parent.add(this.img);
  }
  set(ax: number, ay: number, bx: number, by: number, stretch = false) {
    this.img.setPosition(ax, ay).setRotation(Math.atan2(by - ay, bx - ax));
    if (stretch) { const d = Math.hypot(bx - ax, by - ay); this.img.setScale((d / this.spec.len) / RES, 1 / RES); }
    return this;
  }
}

/** a verlet chain, pinned at its first point */
export class Chain {
  pts: { x: number; y: number; px: number; py: number }[] = [];
  constructor(n: number, public seg: number, x: number, y: number, public damping = 0.9, public gravity = 1200) {
    for (let i = 0; i < n; i++) this.pts.push({ x, y: y + i * seg, px: x, py: y + i * seg });
  }
  reset(x: number, y: number, dx = 0, dy = 1) {
    this.pts.forEach((p, i) => { p.x = p.px = x + dx * i * this.seg; p.y = p.py = y + dy * i * this.seg; });
  }
  step(dt: number, pinX: number, pinY: number, iters = 4, force?: (i: number) => V, endPin?: V) {
    const P = this.pts, g = this.gravity * dt * dt;
    for (let i = 1; i < P.length; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * this.damping, vy = (p.y - p.py) * this.damping;
      p.px = p.x; p.py = p.y;
      const f = force ? force(i) : undefined;
      p.x += vx + (f ? f.x * dt * dt : 0); p.y += vy + g + (f ? f.y * dt * dt : 0);
    }
    for (let it = 0; it < iters; it++) {
      P[0].x = pinX; P[0].y = pinY;
      if (endPin) { const e = P[P.length - 1]; e.x = endPin.x; e.y = endPin.y; }
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - this.seg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
    P[0].x = pinX; P[0].y = pinY;
  }
}

/** draws a chain as rotated segment sprites, tapering */
export class ChainView {
  segs: Phaser.GameObjects.Image[] = [];
  constructor(scene: Phaser.Scene, n: number, key: string, depth: number, public w0 = 1, public w1 = 0.4, public segLen = 10) {
    for (let i = 0; i < n - 1; i++) this.segs.push(scene.add.image(0, 0, key).setOrigin(0.1, 0.5).setDepth(depth));
  }
  /** texture is `segLen` world px long at scale 1/RES; w0..w1 scale the thickness from root to tip */
  draw(pts: V[]) {
    for (let i = 0; i < this.segs.length; i++) {
      const a = pts[i], b = pts[i + 1], s = this.segs[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const w = lerp(this.w0, this.w1, i / Math.max(1, this.segs.length - 1));
      s.setPosition(a.x, a.y).setRotation(Math.atan2(b.y - a.y, b.x - a.x)).setScale(Math.max(0.2, (d + 1.2) / this.segLen) / RES, w / RES);
    }
  }
  setVisible(v: boolean) { for (const s of this.segs) s.setVisible(v); }
  setAlpha(a: number) { for (const s of this.segs) s.setAlpha(a); }
  destroy() { for (const s of this.segs) s.destroy(); }
}

/** a leg that keeps its foot planted in the world and steps (an arc) when its rest spot moves too far away */
export class Stepper {
  foot: V; from: V; to: V;
  t = 1;            // 1 = planted
  constructor(x: number, y: number, public dur = 0.18, public lift = 10) { this.foot = { x, y }; this.from = { x, y }; this.to = { x, y }; }
  get planted() { return this.t >= 1; }
  /** start a step to (x, y) */
  stepTo(x: number, y: number, dur = this.dur, lift = this.lift) { this.from = { ...this.foot }; this.to = { x, y }; this.t = 0; this.dur = dur; this.lift = lift; }
  update(dt: number) {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dt / this.dur);
    const e = smooth(this.t);
    this.foot.x = lerp(this.from.x, this.to.x, e);
    this.foot.y = lerp(this.from.y, this.to.y, e) - Math.sin(this.t * Math.PI) * this.lift;
    return this.t >= 1; // just landed
  }
  place(x: number, y: number) { this.foot = { x, y }; this.from = { x, y }; this.to = { x, y }; this.t = 1; }
}

/** soft round blob texture of a given size (for bodies, heads, abdomens) */
export function blob(scene: Phaser.Scene, key: string, w: number, h: number, shape: (c: CanvasRenderingContext2D) => void, color = INK) {
  return tex(scene, key, w, h, shape, color);
}
